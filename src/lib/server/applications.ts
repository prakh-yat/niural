import { Prisma } from "@prisma/client";
import { z } from "zod";
import { addDays } from "date-fns";

import { buildResearchProfile, draftOfferLetter, screenResume } from "@/lib/integrations/openrouter";
import { createEnvelope } from "@/lib/integrations/docusign";
import { extractResumeText, extractUrls, readFileBuffer, validateResume } from "@/lib/integrations/resume";
import { searchProfiles } from "@/lib/integrations/serper";
import type { JobRecord } from "@/lib/domain";
import { env, envFlags } from "@/lib/env";
import { fallbackJobCatalog } from "@/lib/job-catalog";
import { buildAppUrl } from "@/lib/portal";
import {
  getDatabaseUnavailableMessage,
  isRecoverableDatabaseError,
  withDatabaseFallback,
} from "@/lib/server/database";
import { sendTrackedEmail } from "@/lib/server/email";
import { buildOfferPdfBuffer, buildOfferPdfFileName, buildOfferPdfPath } from "@/lib/server/offer-pdf";
import { buildOfferHtml, buildOfferMarkdown } from "@/lib/server/offer-template";
import { updateApplicationStage } from "@/lib/server/pipeline";
import { ensureWorkflowJob, recordIntegrationEvent } from "@/lib/server/workflows";
import { createSupabaseAdminClient } from "@/lib/server/auth";
import { prisma } from "@/lib/prisma";

const applicationSchema = z.object({
  jobId: z.string().min(1),
  jobSlug: z.string().optional().or(z.literal("")),
  fullName: z.string().min(2),
  email: z.string().email(),
  linkedInUrl: z.string().url().optional().or(z.literal("")),
  portfolioUrl: z.string().url().optional().or(z.literal("")),
});

type MutationResult = {
  ok: true;
  mode: "preview" | "live";
};

type SubmitApplicationResult = {
  mode: "preview" | "live";
  redirectPath: string;
  pendingWork?: PendingApplicationWork;
};

type PendingApplicationWork = {
  applicationId: string;
  job: JobRecord;
  parsed: z.infer<typeof applicationSchema>;
  resume: {
    buffer: Buffer;
    type: string;
  };
  portalUrl: string;
};

type OfferDraftOverrides = {
  jobTitle?: string;
  startDate?: string | Date;
  baseSalary?: number;
  bonus?: string;
  equity?: string;
  managerName?: string;
  managerGreeting?: string;
  customTerms?: string;
};

const DEFAULT_OFFER_START_DELAY_DAYS = 30;
const DEFAULT_OFFER_BASE_SALARY = 180000;
const DEFAULT_OFFER_BONUS = "10% annual bonus";
const DEFAULT_OFFER_EQUITY = "0.05% stock options";
const DEFAULT_OFFER_TERMS = "Standard Niural employment terms apply.";
const DEFAULT_MANAGER_GREETING = "We are excited to have you build with us.";

function buildAbsoluteAppUrl(path: string) {
  const baseUrl = env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  return `${baseUrl}${path}`;
}

function buildOfferDeliveryEmail(input: {
  candidateName: string;
  jobTitle: string;
  offerUrl: string;
  pdfUrl: string;
  startDate: Date;
  baseSalary: number;
  managerName: string;
  docusignMode: "live" | "preview";
}) {
  const salary = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(input.baseSalary);
  const startDate = input.startDate.toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
  const signingHeading =
    input.docusignMode === "live"
      ? "Your DocuSign signature request is on its way."
      : "Your offer is now available in the Niural portal.";
  const signingBody =
    input.docusignMode === "live"
      ? "Open the portal for the complete offer package and PDF copy, and check your inbox for the DocuSign email to review and sign."
      : "Open the portal to review the offer package and PDF copy now. If DocuSign is unavailable locally, the hiring team can still coordinate signature handoff after your review.";

  return {
    subject: `Your Niural offer letter for ${input.jobTitle}`,
    html: `<p>Hi ${input.candidateName},</p>
<p>We are pleased to share your offer letter for the <strong>${input.jobTitle}</strong> role at Niural.</p>
<p><strong>Start date:</strong> ${startDate}<br /><strong>Base salary:</strong> ${salary}<br /><strong>Hiring manager:</strong> ${input.managerName}</p>
<p><strong>${signingHeading}</strong> ${signingBody}</p>
<p><a href="${input.offerUrl}">Review your offer in the candidate portal</a></p>
<p><a href="${input.pdfUrl}">Download the offer letter PDF</a></p>
<p>Best,<br />${input.managerName}<br />Niural</p>`,
    text: [
      `Hi ${input.candidateName},`,
      "",
      `We are pleased to share your offer letter for the ${input.jobTitle} role at Niural.`,
      `Start date: ${startDate}`,
      `Base salary: ${salary}`,
      `Hiring manager: ${input.managerName}`,
      "",
      input.docusignMode === "live"
        ? "Your DocuSign signature request is on its way. Open the portal for a copy of the offer package, and check your inbox for the DocuSign email to review and sign."
        : "Your offer is now available in the Niural portal. Open the portal to review it now. If DocuSign is unavailable locally, the hiring team can still coordinate signature handoff after your review.",
      "",
      `Review your offer: ${input.offerUrl}`,
      `Download the offer letter PDF: ${input.pdfUrl}`,
      "",
      `Best,`,
      `${input.managerName}`,
      "Niural",
    ].join("\n"),
  };
}

async function uploadResume(buffer: Buffer, fileName: string, contentType: string) {
  const admin = createSupabaseAdminClient();
  if (!admin) {
    return {
      path: `preview/${fileName}`,
      mode: "preview" as const,
    };
  }

  const storagePath = `applications/${Date.now()}-${fileName.replace(/\s+/g, "-")}`;
  const bucket = env.SUPABASE_STORAGE_BUCKET;

  try {
    const { error } = await admin.storage.from(bucket).upload(storagePath, buffer, {
      contentType,
      upsert: true,
    });

    if (error) {
      console.warn(`[resume-upload] Supabase storage error: ${error.message}. Using local path.`);
      return { path: `local/${storagePath}`, mode: "preview" as const };
    }
  } catch (err) {
    console.warn(`[resume-upload] Upload failed: ${err instanceof Error ? err.message : err}. Using local path.`);
    return { path: `local/${storagePath}`, mode: "preview" as const };
  }

  return {
    path: storagePath,
    mode: "live" as const,
  };
}

function buildResearchNotes(input: {
  fullName: string;
  linkedInUrl?: string;
  portfolioUrl?: string;
  extractedUrls: string[];
  serperResults: { title: string; snippet: string; link: string }[];
}) {
  const notes = [
    input.linkedInUrl ? `LinkedIn: ${input.linkedInUrl}` : null,
    input.portfolioUrl ? `Portfolio: ${input.portfolioUrl}` : null,
    ...input.extractedUrls.map((url) => `Resume URL: ${url}`),
    ...input.serperResults.map(
      (result) => `Search result: ${result.title} | ${result.snippet} | ${result.link}`,
    ),
  ].filter(Boolean);

  return notes as string[];
}

function buildAppliedStatusHistory() {
  return [{ stage: "applied", at: new Date().toISOString(), note: "Application submitted." }];
}

function resolveConnectedMetadata(
  metadata: Prisma.JsonValue | null | undefined,
) {
  return metadata && typeof metadata === "object" && !Array.isArray(metadata)
    ? (metadata as Record<string, unknown>)
    : null;
}

function resolveConnectedManagerName(metadata: Record<string, unknown> | null) {
  return (
    (typeof metadata?.name === "string" && metadata.name) ||
    (typeof metadata?.email === "string" && metadata.email
      ? metadata.email.split("@")[0]
      : "Hiring manager")
  );
}

function parseOfferStartDate(value?: string | Date) {
  if (!value) {
    return addDays(new Date(), DEFAULT_OFFER_START_DELAY_DAYS);
  }

  if (value instanceof Date) {
    return value;
  }

  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime())
    ? addDays(new Date(), DEFAULT_OFFER_START_DELAY_DAYS)
    : parsed;
}

async function buildOfferDraftContent(input: {
  candidateName: string;
  jobTitle: string;
  startDate: Date;
  baseSalary: number;
  bonus: string;
  equity: string;
  managerName: string;
  managerGreeting: string;
  customTerms: string;
  candidateHeadline?: string | null;
  candidateLocation?: string | null;
  team?: string;
  jobOverview?: string;
}) {
  const aiDraft = await draftOfferLetter({
    candidateName: input.candidateName,
    jobTitle: input.jobTitle,
    startDate: input.startDate.toISOString().slice(0, 10),
    baseSalary: input.baseSalary,
    bonus: input.bonus,
    equity: input.equity,
    managerName: input.managerName,
    managerGreeting: input.managerGreeting,
    customTerms: input.customTerms,
    candidateHeadline: input.candidateHeadline ?? undefined,
    candidateLocation: input.candidateLocation ?? undefined,
    team: input.team,
    jobOverview: input.jobOverview,
  });

  return {
    markdown: buildOfferMarkdown({
      candidateName: input.candidateName,
      jobTitle: input.jobTitle,
      startDate: input.startDate,
      baseSalary: input.baseSalary,
      bonus: input.bonus,
      equity: input.equity,
      managerName: input.managerName,
      managerGreeting: input.managerGreeting,
      customTerms: input.customTerms,
      openingParagraph: aiDraft.openingParagraph,
      roleParagraph: aiDraft.roleParagraph,
      compensationParagraph: aiDraft.compensationParagraph,
      termsParagraph: aiDraft.termsParagraph,
      managerNote: aiDraft.managerNote,
      closingParagraph: aiDraft.closingParagraph,
    }),
    html: buildOfferHtml({
      candidateName: input.candidateName,
      jobTitle: input.jobTitle,
      startDate: input.startDate,
      baseSalary: input.baseSalary,
      bonus: input.bonus,
      equity: input.equity,
      managerName: input.managerName,
      managerGreeting: input.managerGreeting,
      customTerms: input.customTerms,
      openingParagraph: aiDraft.openingParagraph,
      roleParagraph: aiDraft.roleParagraph,
      compensationParagraph: aiDraft.compensationParagraph,
      termsParagraph: aiDraft.termsParagraph,
      managerNote: aiDraft.managerNote,
      closingParagraph: aiDraft.closingParagraph,
    }),
  };
}

async function getConnectedInterviewerMetadata() {
  const connectedInterviewer = await prisma.integrationCredential.findUnique({
    where: {
      provider_lookupKey: {
        provider: "google_calendar",
        lookupKey: "primary_interviewer",
      },
    },
    select: {
      metadata: true,
    },
  });

  return resolveConnectedMetadata(connectedInterviewer?.metadata);
}

async function buildOfferDraftMutation(input: {
  application: Prisma.ApplicationGetPayload<{
    include: {
      candidate: true;
      jobOpening: true;
      offerDrafts: {
        orderBy: { createdAt: "desc" };
      };
    };
  }>;
  overrides?: OfferDraftOverrides;
}) {
  const interviewerMetadata = await getConnectedInterviewerMetadata();
  const latestOffer = input.application.offerDrafts[0];
  const startDate = parseOfferStartDate(input.overrides?.startDate ?? latestOffer?.startDate);
  const jobTitle =
    input.overrides?.jobTitle?.trim() ||
    latestOffer?.jobTitle ||
    input.application.roleSelectionSnapshot;
  const baseSalary =
    input.overrides?.baseSalary ??
    latestOffer?.baseSalary ??
    DEFAULT_OFFER_BASE_SALARY;
  const bonus =
    input.overrides?.bonus?.trim() ||
    latestOffer?.bonus ||
    DEFAULT_OFFER_BONUS;
  const equity =
    input.overrides?.equity?.trim() ||
    latestOffer?.equity ||
    DEFAULT_OFFER_EQUITY;
  const managerName =
    input.overrides?.managerName?.trim() ||
    latestOffer?.managerName ||
    resolveConnectedManagerName(interviewerMetadata);
  const managerGreeting =
    input.overrides?.managerGreeting?.trim() ||
    input.application.candidate.managerGreeting ||
    DEFAULT_MANAGER_GREETING;
  const customTerms =
    input.overrides?.customTerms?.trim() ||
    latestOffer?.customTerms ||
    DEFAULT_OFFER_TERMS;
  const content = await buildOfferDraftContent({
    candidateName: input.application.fullName,
    jobTitle,
    startDate,
    baseSalary,
    bonus,
    equity,
    managerName,
    managerGreeting,
    customTerms,
    candidateHeadline: input.application.candidate.title,
    candidateLocation: input.application.candidate.location,
    team: input.application.jobOpening.team,
    jobOverview: input.application.jobOpening.overview,
  });

  return {
    jobTitle,
    startDate,
    baseSalary,
    bonus,
    equity,
    managerName,
    managerGreeting,
    customTerms,
    ...content,
  };
}

async function persistOfferDraft(input: {
  application: Prisma.ApplicationGetPayload<{
    include: {
      candidate: true;
      offerDrafts: {
        orderBy: { createdAt: "desc" };
      };
    };
  }>;
  mutation: Awaited<ReturnType<typeof buildOfferDraftMutation>>;
}) {
  const existingDraft = input.application.offerDrafts.find((offer) => offer.status === "draft");
  const sharedData = {
    jobTitle: input.mutation.jobTitle,
    startDate: input.mutation.startDate,
    baseSalary: input.mutation.baseSalary,
    bonus: input.mutation.bonus,
    equity: input.mutation.equity,
    managerName: input.mutation.managerName,
    customTerms: input.mutation.customTerms,
    markdown: input.mutation.markdown,
    html: input.mutation.html,
  };

  const operations: Prisma.PrismaPromise<unknown>[] = [
    prisma.profile.update({
      where: { id: input.application.candidateId },
      data: {
        managerGreeting: input.mutation.managerGreeting,
      },
    }),
  ];

  if (existingDraft) {
    operations.push(
      prisma.offerDraft.update({
        where: { id: existingDraft.id },
        data: sharedData,
      }),
    );
  } else {
    operations.push(
      prisma.offerDraft.create({
        data: {
          applicationId: input.application.id,
          status: "draft",
          ...sharedData,
        },
      }),
    );
  }

  const [, offer] = (await prisma.$transaction(operations)) as [
    Prisma.ProfileGetPayload<Record<string, never>>,
    Prisma.OfferDraftGetPayload<Record<string, never>>,
  ];

  return offer;
}

async function safeSearchProfiles(query: string) {
  if (!envFlags.hasSerper) {
    return [] as { title: string; snippet: string; link: string }[];
  }

  try {
    return (await searchProfiles(query)) as {
      title: string;
      snippet: string;
      link: string;
    }[];
  } catch (error) {
    console.error("[applications] Profile search failed:", error);
    return [];
  }
}

function mapJobOpeningToJobRecord(
  job: Awaited<ReturnType<typeof prisma.jobOpening.findUniqueOrThrow>>,
): JobRecord {
  return {
    id: job.id,
    slug: job.slug,
    postedAt: job.createdAt.toISOString(),
    title: job.title,
    team: job.team,
    location: job.location,
    remoteLabel: job.remoteLabel,
    experienceLevel: job.experienceLevel,
    overview: job.overview,
    responsibilities: job.responsibilities,
    requirements: job.requirements,
    differentiators: job.differentiators,
    aiLeverageSummary: job.aiLeverageSummary ?? "",
    compensationBand: job.compensationBand ?? "Competitive",
    status: job.status,
  };
}

function findFallbackJob(input: { jobId: string; jobSlug?: string }) {
  if (input.jobSlug) {
    const bySlug = fallbackJobCatalog.find((job) => job.slug === input.jobSlug);
    if (bySlug) {
      return bySlug;
    }
  }

  return fallbackJobCatalog.find((job) => job.id === input.jobId || job.slug === input.jobId) ?? null;
}

function buildJobOpeningPayload(job: JobRecord) {
  return {
    slug: job.slug,
    title: job.title,
    team: job.team,
    location: job.location,
    remoteLabel: job.remoteLabel,
    experienceLevel: job.experienceLevel,
    overview: job.overview,
    responsibilities: job.responsibilities,
    requirements: job.requirements,
    differentiators: job.differentiators,
    compensationBand: job.compensationBand,
    status: job.status,
    aiLeverageSummary: job.aiLeverageSummary || null,
  };
}

async function resolveSubmissionJob(input: { jobId: string; jobSlug?: string }) {
  const fallbackJob = findFallbackJob(input);
  const lookupSlug = input.jobSlug || fallbackJob?.slug;

  try {
    if (lookupSlug) {
      const existingBySlug = await prisma.jobOpening.findUnique({
        where: { slug: lookupSlug },
      });

      if (existingBySlug) {
        return mapJobOpeningToJobRecord(existingBySlug);
      }
    }

    if (!input.jobId.startsWith("fallback-")) {
      const existingById = await prisma.jobOpening.findUnique({
        where: { id: input.jobId },
      });

      if (existingById) {
        return mapJobOpeningToJobRecord(existingById);
      }
    }

    if (fallbackJob) {
      const syncedJob = await prisma.jobOpening.upsert({
        where: { slug: fallbackJob.slug },
        update: buildJobOpeningPayload(fallbackJob),
        create: buildJobOpeningPayload(fallbackJob),
      });

      return mapJobOpeningToJobRecord(syncedJob);
    }
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      throw new Error("A candidate with this email has already applied for this role.");
    }

    if (isRecoverableDatabaseError(error)) {
      throw new Error(
        getDatabaseUnavailableMessage(
          "We couldn't reach the application database. Please try again in a minute.",
        ),
      );
    }

    throw error;
  }

  return null;
}

export async function processSubmittedApplication(work: PendingApplicationWork) {
  const { applicationId, job, parsed, portalUrl, resume } = work;

  let nextStage: "applied" | "screened" | "shortlisted" = "applied";
  let resumeText = "";
  let extractedUrls: string[] = [];

  try {
    resumeText = await extractResumeText(resume.buffer, resume.type);
    extractedUrls = extractUrls(resumeText);

    await prisma.resumeAsset.update({
      where: { applicationId },
      data: {
        extractedText: resumeText,
        extractedLinks: extractedUrls,
      },
    });
  } catch (error) {
    console.error(`[applications] Resume extraction failed for ${applicationId}:`, error);
  }

  if (resumeText) {
    try {
      const screening = await screenResume({
        job,
        resumeText,
        linkedInUrl: parsed.linkedInUrl,
        portfolioUrl: parsed.portfolioUrl || undefined,
      });

      nextStage = screening.fitScore >= env.AUTO_SHORTLIST_THRESHOLD ? "shortlisted" : "screened";

      await prisma.screeningResult.create({
        data: {
          applicationId,
          fitScore: screening.fitScore,
          rationale: screening.rationale,
          strengths: screening.strengths,
          gaps: screening.gaps,
          skills: screening.skills,
          yearsExperience: screening.yearsExperience.toFixed(1),
          education: screening.education,
          pastEmployers: screening.pastEmployers,
          achievements: screening.achievements,
          thresholdUsed: env.AUTO_SHORTLIST_THRESHOLD,
          autoShortlisted: screening.fitScore >= env.AUTO_SHORTLIST_THRESHOLD,
          sourceModel: env.OPENROUTER_MODEL_PRIMARY,
        },
      });

      await prisma.application.update({
        where: { id: applicationId },
        data: {
          stage: nextStage,
          stageReason: screening.rationale,
          statusHistory: [
            ...buildAppliedStatusHistory(),
            {
              stage: nextStage,
              at: new Date().toISOString(),
              note:
                nextStage === "shortlisted"
                  ? "Auto-shortlisted by AI threshold."
                  : "Screened and awaiting manual review.",
            },
          ],
        },
      });

      await ensureWorkflowJob("screening_completed", { applicationId });
      await recordIntegrationEvent("openrouter", "screening.completed", "success", {
        applicationId,
        fitScore: screening.fitScore,
      });
    } catch (error) {
      console.error(`[applications] Screening failed for ${applicationId}:`, error);
    }
  }

  try {
    const serperResults = await safeSearchProfiles(
      `${parsed.fullName} ${job.title} LinkedIn GitHub portfolio`,
    );
    const research = await buildResearchProfile({
      candidateName: parsed.fullName,
      jobTitle: job.title,
      sourceNotes: buildResearchNotes({
        fullName: parsed.fullName,
        linkedInUrl: parsed.linkedInUrl,
        portfolioUrl: parsed.portfolioUrl || undefined,
        extractedUrls,
        serperResults,
      }),
    });

    await prisma.researchProfile.create({
      data: {
        applicationId,
        candidateBrief: research.candidateBrief,
        githubSummary: research.githubSummary,
        linkedInSummary: research.linkedInSummary,
        xSummary: research.xSummary,
        discrepancyFlags: research.discrepancyFlags,
        completeness: research.completeness,
        sources: [
          { label: "LinkedIn", href: parsed.linkedInUrl },
          ...(parsed.portfolioUrl ? [{ label: "Portfolio", href: parsed.portfolioUrl }] : []),
          ...extractedUrls.map((href) => ({ label: "Resume URL", href })),
          ...serperResults.map((entry) => ({ label: entry.title, href: entry.link })),
        ],
        sourceModel: env.OPENROUTER_MODEL_PRIMARY,
      },
    });
  } catch (error) {
    console.error(`[applications] Research failed for ${applicationId}:`, error);
  }

  try {
    await sendTrackedEmail({
      to: parsed.email,
      subject: `Application received · ${job.title}`,
      html: `<p>Thanks for applying to Niural for <strong>${job.title}</strong>.</p><p>Track your application status: <a href="${portalUrl}">${portalUrl}</a></p>${nextStage === "shortlisted" ? `<p><strong>Great news!</strong> Your profile scored highly and you have been shortlisted for this role.</p>` : "<p>Our team will review your application and get back to you shortly.</p>"}`,
      text: `Thanks for applying to Niural for ${job.title}. Track your application: ${portalUrl}`,
      eventType: "application.confirmation_email",
      payload: {
        applicationId,
        candidateEmail: parsed.email,
        recipientRole: "candidate",
        jobTitle: job.title,
      },
    });
  } catch (error) {
    console.error(`[applications] Confirmation email failed for ${applicationId}:`, error);
  }
}

export async function submitApplication(
  formData: FormData,
  baseUrl = env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000",
): Promise<SubmitApplicationResult> {
  const raw = {
    jobId: formData.get("jobId"),
    jobSlug: formData.get("jobSlug") ?? undefined,
    fullName: formData.get("fullName"),
    email: formData.get("email"),
    linkedInUrl: formData.get("linkedInUrl"),
    portfolioUrl: formData.get("portfolioUrl"),
  };

  const parsed = applicationSchema.parse(raw);
  const resume = formData.get("resume");

  if (!(resume instanceof File)) {
    throw new Error("Resume file is required.");
  }

  validateResume(resume);

  const job = await resolveSubmissionJob({
    jobId: parsed.jobId,
    jobSlug: parsed.jobSlug || undefined,
  });

  if (!job) {
    throw new Error("Selected role was not found.");
  }

  if (job.status !== "open") {
    throw new Error("This role is no longer accepting applications.");
  }

  const resumeBuffer = await readFileBuffer(resume);
  const portalUrl = `${baseUrl}/app`;

  let application: Awaited<ReturnType<typeof prisma.application.create>>;

  try {
    const duplicate = await prisma.application.findUnique({
      where: {
        email_jobOpeningId: {
          email: parsed.email,
          jobOpeningId: job.id,
        },
      },
    });

    if (duplicate) {
      throw new Error("A candidate with this email has already applied for this role.");
    }

    const storage = await uploadResume(resumeBuffer, resume.name, resume.type);
    const candidate = await prisma.profile.upsert({
      where: { email: parsed.email },
      update: {
        fullName: parsed.fullName,
        role: "candidate",
        metadata: {
          linkedInUrl: parsed.linkedInUrl,
          portfolioUrl: parsed.portfolioUrl || undefined,
        },
      },
      create: {
        email: parsed.email,
        fullName: parsed.fullName,
        role: "candidate",
        metadata: {
          linkedInUrl: parsed.linkedInUrl,
          portfolioUrl: parsed.portfolioUrl || undefined,
        },
      },
    });

    application = await prisma.application.create({
      data: {
        candidateId: candidate.id,
        jobOpeningId: job.id,
        fullName: parsed.fullName,
        email: parsed.email,
        linkedInUrl: parsed.linkedInUrl,
        portfolioUrl: parsed.portfolioUrl || undefined,
        roleSelectionSnapshot: job.title,
        stage: "applied",
        stageReason: "Application submitted and queued for review.",
        statusHistory: buildAppliedStatusHistory(),
        resumeAsset: {
          create: {
            fileName: resume.name,
            mimeType: resume.type,
            fileSize: resume.size,
            storagePath: storage.path,
            extractedText: null,
            extractedLinks: [],
          },
        },
      },
    });
  } catch (error) {
    if (isRecoverableDatabaseError(error)) {
      throw new Error(
        getDatabaseUnavailableMessage(
          "We couldn't submit your application right now because the database is unavailable. Please try again in a minute.",
        ),
      );
    }

    throw error;
  }

  try {
    await ensureWorkflowJob("application_submitted", { applicationId: application.id });
  } catch (error) {
    console.error(`[applications] Workflow enqueue failed for ${application.id}:`, error);
  }

  return {
    mode: "live" as const,
    redirectPath: `/jobs/${job.slug}`,
    pendingWork: {
      applicationId: application.id,
      job,
      parsed,
      portalUrl,
      resume: {
        buffer: resumeBuffer,
        type: resume.type,
      },
    },
  };
}

export async function rerunScreening(applicationId: string) {
  return withDatabaseFallback<MutationResult>(async () => {
    const application = await prisma.application.findUnique({
      where: { id: applicationId },
      include: {
        jobOpening: true,
        resumeAsset: true,
      },
    });

    if (!application || !application.resumeAsset?.extractedText) {
      throw new Error("Application or extracted resume text not found.");
    }

    const screening = await screenResume({
      job: {
        id: application.jobOpening.id,
        slug: application.jobOpening.slug,
        postedAt: application.jobOpening.createdAt.toISOString(),
        title: application.jobOpening.title,
        team: application.jobOpening.team,
        location: application.jobOpening.location,
        remoteLabel: application.jobOpening.remoteLabel,
        experienceLevel: application.jobOpening.experienceLevel,
        overview: application.jobOpening.overview,
        responsibilities: application.jobOpening.responsibilities,
        requirements: application.jobOpening.requirements,
        differentiators: application.jobOpening.differentiators,
        aiLeverageSummary: application.jobOpening.aiLeverageSummary ?? "",
        compensationBand: application.jobOpening.compensationBand ?? "Competitive",
        status: application.jobOpening.status,
      },
      resumeText: application.resumeAsset.extractedText,
      linkedInUrl: application.linkedInUrl ?? undefined,
      portfolioUrl: application.portfolioUrl ?? undefined,
    });

    const nextStage =
      screening.fitScore >= env.AUTO_SHORTLIST_THRESHOLD ? "shortlisted" : "screened";
    await prisma.screeningResult.upsert({
      where: { applicationId },
      update: {
        fitScore: screening.fitScore,
        rationale: screening.rationale,
        strengths: screening.strengths,
        gaps: screening.gaps,
        skills: screening.skills,
        yearsExperience: screening.yearsExperience.toFixed(1),
        education: screening.education,
        pastEmployers: screening.pastEmployers,
        achievements: screening.achievements,
        autoShortlisted: screening.fitScore >= env.AUTO_SHORTLIST_THRESHOLD,
      },
      create: {
        applicationId,
        fitScore: screening.fitScore,
        rationale: screening.rationale,
        strengths: screening.strengths,
        gaps: screening.gaps,
        skills: screening.skills,
        yearsExperience: screening.yearsExperience.toFixed(1),
        education: screening.education,
        pastEmployers: screening.pastEmployers,
        achievements: screening.achievements,
        thresholdUsed: env.AUTO_SHORTLIST_THRESHOLD,
        autoShortlisted: screening.fitScore >= env.AUTO_SHORTLIST_THRESHOLD,
        sourceModel: env.OPENROUTER_MODEL_PRIMARY,
      },
    });

    await prisma.application.update({
      where: { id: applicationId },
      data: {
        stage: nextStage,
        stageReason: screening.rationale,
      },
    });

    return { ok: true, mode: "live" as const };
  }, () => ({ ok: true, mode: "preview" as const }));
}

export async function rerunResearch(applicationId: string) {
  return withDatabaseFallback<MutationResult>(async () => {
    const application = await prisma.application.findUnique({
      where: { id: applicationId },
      include: {
        jobOpening: true,
        resumeAsset: true,
      },
    });

    if (!application) {
      throw new Error("Application not found.");
    }

    const serperResults = envFlags.hasSerper
      ? ((await searchProfiles(
          `${application.fullName} ${application.jobOpening.title} LinkedIn GitHub`,
        )) as { title: string; snippet: string; link: string }[])
      : [];

    const research = await buildResearchProfile({
      candidateName: application.fullName,
      jobTitle: application.jobOpening.title,
      sourceNotes: buildResearchNotes({
        fullName: application.fullName,
        linkedInUrl: application.linkedInUrl ?? undefined,
        portfolioUrl: application.portfolioUrl ?? undefined,
        extractedUrls: application.resumeAsset?.extractedLinks ?? [],
        serperResults,
      }),
    });

    await prisma.researchProfile.upsert({
      where: { applicationId },
      update: {
        candidateBrief: research.candidateBrief,
        githubSummary: research.githubSummary,
        linkedInSummary: research.linkedInSummary,
        xSummary: research.xSummary,
        discrepancyFlags: research.discrepancyFlags,
        completeness: research.completeness,
        sourceModel: env.OPENROUTER_MODEL_PRIMARY,
      },
      create: {
        applicationId,
        candidateBrief: research.candidateBrief,
        githubSummary: research.githubSummary,
        linkedInSummary: research.linkedInSummary,
        xSummary: research.xSummary,
        discrepancyFlags: research.discrepancyFlags,
        completeness: research.completeness,
        sourceModel: env.OPENROUTER_MODEL_PRIMARY,
      },
    });

    return { ok: true, mode: "live" as const };
  }, () => ({ ok: true, mode: "preview" as const }));
}

export async function createOfferDraft(input: {
  applicationId: string;
  overrides?: OfferDraftOverrides;
  stageNote?: string;
  stageActor?: "admin" | "ai" | "candidate" | "system";
  stageVisibility?: "public" | "admin";
}): Promise<{ mode: "preview" | "live"; offerId: string }> {
  return withDatabaseFallback<{ mode: "preview" | "live"; offerId: string }>(async () => {
    const application = await prisma.application.findUnique({
      where: { id: input.applicationId },
      include: {
        jobOpening: true,
        candidate: true,
        offerDrafts: {
          orderBy: { createdAt: "desc" },
        },
      },
    });

    if (!application) {
      throw new Error("Application not found.");
    }

    const mutation = await buildOfferDraftMutation({
      application,
      overrides: input.overrides,
    });
    const offer = await persistOfferDraft({ application, mutation });

    await updateApplicationStage({
      applicationId: application.id,
      stage: "offer_drafting",
      note: input.stageNote ?? "Offer draft created for review.",
      actor: input.stageActor ?? "system",
      visibility: input.stageVisibility ?? "admin",
    });

    await ensureWorkflowJob("offer_draft_created", { applicationId: application.id, offerId: offer.id });

    return { mode: "live" as const, offerId: offer.id };
  }, () => ({ mode: "preview" as const, offerId: "preview-offer" }));
}

export async function updateOfferDraft(input: {
  offerId: string;
  overrides: OfferDraftOverrides;
}): Promise<{ mode: "preview" | "live"; offerId: string }> {
  return withDatabaseFallback<{ mode: "preview" | "live"; offerId: string }>(async () => {
    const offer = await prisma.offerDraft.findUnique({
      where: { id: input.offerId },
      include: {
        application: {
          include: {
            candidate: true,
            jobOpening: true,
            offerDrafts: {
              orderBy: { createdAt: "desc" },
            },
          },
        },
      },
    });

    if (!offer) {
      throw new Error("Offer draft not found.");
    }

    if (offer.status !== "draft") {
      throw new Error("Only draft offers can be edited.");
    }

    const mutation = await buildOfferDraftMutation({
      application: offer.application,
      overrides: input.overrides,
    });

    await persistOfferDraft({
      application: offer.application,
      mutation,
    });

    await recordIntegrationEvent("docusign", "offer.draft_updated", "success", {
      offerId: offer.id,
      applicationId: offer.applicationId,
    });

    return {
      mode: "live" as const,
      offerId: offer.id,
    };
  }, () => ({ mode: "preview" as const, offerId: input.offerId }));
}

export async function sendOfferDraft(input: {
  offerId: string;
  overrides?: OfferDraftOverrides;
}): Promise<{
  mode: "preview" | "live";
  offerId: string;
  envelopeId?: string;
  deliveryMode: "docusign" | "portal_email";
  emailDeliveryMode: "live" | "preview" | "failed";
  warningMessage?: string;
}> {
  return withDatabaseFallback<{
    mode: "preview" | "live";
    offerId: string;
    envelopeId?: string;
    deliveryMode: "docusign" | "portal_email";
    emailDeliveryMode: "live" | "preview" | "failed";
    warningMessage?: string;
  }>(async () => {
    if (input.overrides) {
      await updateOfferDraft({
        offerId: input.offerId,
        overrides: input.overrides,
      });
    }

    const offer = await prisma.offerDraft.findUnique({
      where: { id: input.offerId },
      include: {
        application: {
          include: {
            candidate: true,
          },
        },
      },
    });

    if (!offer) {
      throw new Error("Offer draft not found.");
    }

    const canRetryDocusign = offer.status === "sent" && !offer.docusignEnvelopeId;
    if (offer.status !== "draft" && !canRetryDocusign) {
      throw new Error("Only draft offers or fallback-sent offers can be sent.");
    }

    const pdfFileName = buildOfferPdfFileName(offer.application.fullName, offer.jobTitle);
    const pdfBuffer = await buildOfferPdfBuffer({
      candidateName: offer.application.fullName,
      jobTitle: offer.jobTitle,
      startDate: offer.startDate,
      baseSalary: offer.baseSalary,
      bonus: offer.bonus,
      equity: offer.equity,
      managerName: offer.managerName,
      markdown: offer.markdown,
    });

    const envelope = await createEnvelope({
      candidateName: offer.application.fullName,
      candidateEmail: offer.application.email,
      subject: `Niural offer letter · ${offer.jobTitle}`,
      documentName: pdfFileName,
      documentBase64: pdfBuffer.toString("base64"),
      fileExtension: "pdf",
    });
    const docusignMode = envelope.mode;
    const sentAt = new Date();
    const offerUrl = buildAbsoluteAppUrl(buildAppUrl(`/offers/${offer.id}`));
    const pdfUrl = buildAbsoluteAppUrl(buildOfferPdfPath(offer.id));

    await prisma.offerDraft.update({
      where: { id: offer.id },
      data: {
        status: "sent",
        docusignEnvelopeId: docusignMode === "live" ? envelope.envelopeId : null,
        pdfStoragePath: buildOfferPdfPath(offer.id),
        sentAt,
      },
    });

    if (offer.status === "draft") {
      await updateApplicationStage({
        applicationId: offer.applicationId,
        stage: "offer_sent",
        note:
          docusignMode === "live"
            ? "Offer sent to candidate for signature review."
            : "Offer published to candidate portal and email fallback while DocuSign is unavailable.",
        actor: "admin",
        visibility: "admin",
      });
    }

    await recordIntegrationEvent(
      "docusign",
      "envelope.sent",
      docusignMode === "live" ? "success" : "failed",
      {
        offerId: offer.id,
        applicationId: offer.applicationId,
        candidateEmail: offer.application.email,
        envelopeId: docusignMode === "live" ? envelope.envelopeId : null,
        deliveryMode: docusignMode === "live" ? "docusign" : "portal_email",
        errorMessage: envelope.errorMessage ?? null,
      },
    );

    let emailDeliveryMode: "live" | "preview" | "failed" = "failed";
    let emailWarningMessage: string | undefined;
    const offerEmail = buildOfferDeliveryEmail({
      candidateName: offer.application.fullName,
      jobTitle: offer.jobTitle,
      offerUrl,
      pdfUrl,
      startDate: offer.startDate,
      baseSalary: offer.baseSalary,
      managerName: offer.managerName,
      docusignMode,
    });

    try {
      const emailResult = await sendTrackedEmail({
        to: offer.application.email,
        subject: offerEmail.subject,
        html: offerEmail.html,
        text: offerEmail.text,
        eventType: "offer.sent_email",
        payload: {
          offerId: offer.id,
          applicationId: offer.applicationId,
          candidateEmail: offer.application.email,
          recipientRole: "candidate",
          jobTitle: offer.jobTitle,
          offerUrl,
          pdfUrl,
          deliveryMode: docusignMode === "live" ? "docusign" : "portal_email",
        },
        attachments: [
          {
            filename: pdfFileName,
            content: pdfBuffer,
            contentType: "application/pdf",
          },
        ],
      });
      emailDeliveryMode = emailResult.mode;
      if (emailResult.mode === "preview") {
        emailWarningMessage = `Candidate email is in preview mode. ${emailResult.message}`;
      }
    } catch (error) {
      emailWarningMessage =
        error instanceof Error ? error.message : "Candidate email delivery failed.";
    }

    return {
      mode: "live" as const,
      offerId: offer.id,
      envelopeId: docusignMode === "live" ? envelope.envelopeId : undefined,
      deliveryMode: docusignMode === "live" ? "docusign" : "portal_email",
      emailDeliveryMode,
      warningMessage:
        emailWarningMessage ??
        (docusignMode === "preview" ? envelope.errorMessage : undefined),
    };
  }, () => ({
    mode: "preview" as const,
    offerId: input.offerId,
    deliveryMode: "portal_email" as const,
    emailDeliveryMode: "preview" as const,
    warningMessage: "Offer send is running in preview mode because the database is unavailable.",
  }));
}

import { z } from "zod";

import { buildResearchProfile, screenResume } from "@/lib/integrations/openrouter";
import { extractResumeText, extractUrls, validateResume } from "@/lib/integrations/resume";
import { sendTransactionalEmail } from "@/lib/integrations/resend";
import { searchProfiles } from "@/lib/integrations/serper";
import { env, envFlags } from "@/lib/env";
import { getJobById } from "@/lib/server/data";
import { createOneTimeMagicLinkPlaceholder, ensureWorkflowJob, recordIntegrationEvent } from "@/lib/server/workflows";
import { createSupabaseAdminClient, generateOneTimeMagicLink } from "@/lib/server/auth";
import { prisma } from "@/lib/prisma";

const applicationSchema = z.object({
  jobId: z.string().min(1),
  fullName: z.string().min(2),
  email: z.string().email(),
  linkedInUrl: z.string().url(),
  portfolioUrl: z.string().url().optional().or(z.literal("")),
});

async function uploadResume(file: File, fileName: string) {
  const admin = createSupabaseAdminClient();
  if (!admin) {
    return {
      path: `preview/${fileName}`,
      mode: "preview" as const,
    };
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const storagePath = `applications/${Date.now()}-${fileName.replace(/\s+/g, "-")}`;
  const bucket = env.SUPABASE_STORAGE_BUCKET;

  await admin.storage.from(bucket).upload(storagePath, buffer, {
    contentType: file.type,
    upsert: true,
  });

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

export async function submitApplication(formData: FormData) {
  const raw = {
    jobId: formData.get("jobId"),
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

  const job = await getJobById(parsed.jobId);
  if (!job) {
    throw new Error("Selected role was not found.");
  }

  if (job.status !== "open") {
    throw new Error("This role is no longer accepting applications.");
  }

  const resumeText = await extractResumeText(resume);
  const extractedUrls = extractUrls(resumeText);
  const serperResults = envFlags.hasSerper
    ? ((await searchProfiles(`${parsed.fullName} ${job.title} LinkedIn GitHub portfolio`)) as {
        title: string;
        snippet: string;
        link: string;
      }[])
    : [];

  const screening = await screenResume({
    job,
    resumeText,
    linkedInUrl: parsed.linkedInUrl,
    portfolioUrl: parsed.portfolioUrl || undefined,
  });

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

  const nextStage = screening.fitScore >= env.AUTO_SHORTLIST_THRESHOLD ? "shortlisted" : "screened";

  if (!envFlags.hasDatabase) {
    const magicLink =
      (await createOneTimeMagicLinkPlaceholder(parsed.email, "candidate", "/candidate")) ??
      `${env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"}/candidate`;
    await sendTransactionalEmail({
      to: parsed.email,
      subject: `Application received · ${job.title}`,
      html: `<p>Thanks for applying to Niural for ${job.title}.</p><p>Your candidate portal: <a href="${magicLink}">${magicLink}</a></p>`,
      text: `Thanks for applying to Niural for ${job.title}. Candidate portal: ${magicLink}`,
    });
    return { mode: "preview" as const, redirectPath: "/candidate?submitted=1" };
  }

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

  const storage = await uploadResume(resume, resume.name);
  const candidate = await prisma.profile.upsert({
    where: { email: parsed.email },
    update: {
      fullName: parsed.fullName,
      role: "candidate",
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

  const application = await prisma.application.create({
    data: {
      candidateId: candidate.id,
      jobOpeningId: job.id,
      fullName: parsed.fullName,
      email: parsed.email,
      linkedInUrl: parsed.linkedInUrl,
      portfolioUrl: parsed.portfolioUrl || undefined,
      roleSelectionSnapshot: job.title,
      stage: nextStage,
      stageReason: screening.rationale,
      statusHistory: [
        { stage: "applied", at: new Date().toISOString(), note: "Application submitted." },
        {
          stage: nextStage,
          at: new Date().toISOString(),
          note:
            nextStage === "shortlisted"
              ? "Auto-shortlisted by AI threshold."
              : "Screened and awaiting manual review.",
        },
      ],
      resumeAsset: {
        create: {
          fileName: resume.name,
          mimeType: resume.type,
          fileSize: resume.size,
          storagePath: storage.path,
          extractedText: resumeText,
          extractedLinks: extractedUrls,
        },
      },
      screeningResult: {
        create: {
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
      },
      researchProfile: {
        create: {
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
      },
    },
  });

  await ensureWorkflowJob("application_submitted", { applicationId: application.id });
  await ensureWorkflowJob("screening_completed", { applicationId: application.id });
  await recordIntegrationEvent("openrouter", "screening.completed", "success", {
    applicationId: application.id,
    fitScore: screening.fitScore,
  });

  const portalLink =
    (await generateOneTimeMagicLink({
      email: parsed.email,
      role: "candidate",
      redirectPath: "/candidate",
    })) ??
    `${env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"}/candidate`;

  await sendTransactionalEmail({
    to: parsed.email,
    subject: `Application received · ${job.title}`,
    html: `<p>Thanks for applying to Niural for <strong>${job.title}</strong>.</p><p>Use your portal to track screening, scheduling, and offer steps: <a href="${portalLink}">${portalLink}</a></p>`,
    text: `Thanks for applying to Niural for ${job.title}. Portal: ${portalLink}`,
  });

  await recordIntegrationEvent("resend", "application.confirmation_email", "success", {
    applicationId: application.id,
    to: parsed.email,
  });

  return { mode: "live" as const, redirectPath: "/candidate?submitted=1" };
}

export async function rerunScreening(applicationId: string) {
  if (!envFlags.hasDatabase) {
    return { ok: true, mode: "preview" as const };
  }

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

  const nextStage = screening.fitScore >= env.AUTO_SHORTLIST_THRESHOLD ? "shortlisted" : "screened";
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
}

export async function rerunResearch(applicationId: string) {
  if (!envFlags.hasDatabase) {
    return { ok: true, mode: "preview" as const };
  }

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
}

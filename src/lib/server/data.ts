import "server-only";

import { Prisma } from "@prisma/client";
import { unstable_cache } from "next/cache";

import type {
  ApplicationStageKey,
  CandidateRecord,
  JobRecord,
} from "@/lib/domain";
import { fallbackJobCatalog } from "@/lib/job-catalog";
import { prisma } from "@/lib/prisma";
import { readCandidateProfileMetadata, resolveCandidateAvatarUrl } from "@/lib/server/candidate-profile";
import { withDatabaseFallback } from "@/lib/server/database";
import { syncOutstandingOfferSignatures } from "@/lib/server/offer-signatures";
import { formatInterviewSlotWindow } from "@/lib/utils";

const candidateApplicationInclude = Prisma.validator<Prisma.ApplicationInclude>()({
  candidate: true,
  screeningResult: true,
  researchProfile: true,
  interviews: {
    include: {
      offerSets: {
        orderBy: { createdAt: "desc" },
        include: {
          slotHolds: {
            orderBy: { startAt: "asc" },
          },
        },
      },
      transcript: true,
    },
  },
  offerDrafts: { orderBy: { createdAt: "desc" }, take: 1 },
  jobOpening: true,
});

type CandidateApplication = Prisma.ApplicationGetPayload<{
  include: typeof candidateApplicationInclude;
}>;

function parseInterviewRescheduleContext(
  value: Prisma.JsonValue | null,
): CandidateRecord["interview"]["rescheduleRequest"] | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }

  const record = value as Record<string, unknown>;
  const requestedBy = record.requestedBy === "admin" ? "admin" : "candidate";
  const approvalStatus =
    record.approvalStatus === "approved" || record.approvalStatus === "declined"
      ? record.approvalStatus
      : "pending";

  return {
    requestedAt:
      typeof record.requestedAt === "string" ? record.requestedAt : new Date().toISOString(),
    requestedBy,
    rescheduleNotes:
      typeof record.rescheduleNotes === "string" ? record.rescheduleNotes : "",
    approvalStatus,
    proposedSlots: [],
    aiMessage: typeof record.aiMessage === "string" ? record.aiMessage : undefined,
    aiIteration: typeof record.aiIteration === "number" ? record.aiIteration : undefined,
  };
}

function parseStatusHistory(
  statusHistory: Prisma.JsonValue | null,
): NonNullable<CandidateRecord["statusHistory"]> {
  if (!Array.isArray(statusHistory)) {
    return [];
  }

  return statusHistory.flatMap((entry) => {
    if (!entry || typeof entry !== "object" || Array.isArray(entry)) {
      return [];
    }

    const record = entry as Record<string, unknown>;

    const stage =
      typeof record.stage === "string" ? record.stage : "applied";
    const at =
      typeof record.at === "string" ? record.at : new Date().toISOString();
    const note =
      typeof record.note === "string" ? record.note : "";
    const actor =
      record.actor === "ai" ||
      record.actor === "admin" ||
      record.actor === "candidate" ||
      record.actor === "system"
        ? record.actor
        : undefined;
    const visibility =
      record.visibility === "admin" || record.visibility === "public"
        ? record.visibility
        : undefined;

    return [
      {
        stage,
        at,
        note,
        actor,
        visibility,
      },
    ];
  });
}

function parseTranscriptTurns(
  transcriptJson: Prisma.JsonValue | null,
): CandidateRecord["interview"]["transcriptTurns"] {
  if (!transcriptJson || typeof transcriptJson !== "object" || Array.isArray(transcriptJson)) {
    return undefined;
  }

  const record = transcriptJson as Record<string, unknown>;
  if (!Array.isArray(record.turns)) {
    return undefined;
  }

  const turns = record.turns.flatMap((entry) => {
    if (!entry || typeof entry !== "object" || Array.isArray(entry)) {
      return [];
    }

    const turn = entry as Record<string, unknown>;
    if (typeof turn.speaker !== "string" || typeof turn.text !== "string") {
      return [];
    }

    return [
      {
        speaker: turn.speaker,
        text: turn.text,
      },
    ];
  });

  return turns.length > 0 ? turns : undefined;
}

function parseTranscriptDecision(
  transcriptJson: Prisma.JsonValue | null,
): CandidateRecord["interview"]["transcriptDecision"] {
  if (!transcriptJson || typeof transcriptJson !== "object" || Array.isArray(transcriptJson)) {
    return undefined;
  }

  const record = transcriptJson as Record<string, unknown>;
  if (!record.analysis || typeof record.analysis !== "object" || Array.isArray(record.analysis)) {
    return undefined;
  }

  const analysis = record.analysis as Record<string, unknown>;
  return analysis.decision === "selected" || analysis.decision === "rejected"
    ? analysis.decision
    : undefined;
}

function getQueuedInterviewPlaceholder(applicationId: string) {
  return {
    id: `pending-${applicationId}`,
    interviewerName: "",
    interviewerEmail: "",
    status: "queued" as const,
    offeredSlots: [],
  };
}

function mapInterviewSlots(
  slotHolds: Array<{ startAt: Date; endAt: Date; status: string }>,
) {
  return slotHolds
    .slice()
    .sort((left, right) => left.startAt.getTime() - right.startAt.getTime())
    .map((hold) => ({
      label: formatInterviewSlotWindow(hold.startAt, hold.endAt),
      startsAt: hold.startAt.toISOString(),
      endsAt: hold.endAt.toISOString(),
      status: hold.status,
    }));
}

async function toCandidateRecord(application: CandidateApplication): Promise<CandidateRecord> {
  const interview = application.interviews[0];
  const offer = application.offerDrafts[0];
  const research = application.researchProfile;
  const screening = application.screeningResult;
  const profileMetadata = readCandidateProfileMetadata(application.candidate.metadata);
  const avatarUrl = await resolveCandidateAvatarUrl(profileMetadata);
  const openOfferSet = interview?.offerSets.find((set) => set.status === "open");
  const pendingApprovalSet = interview?.offerSets.find((set) => set.status === "pending_approval");
  const offeredSlots = openOfferSet ? mapInterviewSlots(openOfferSet.slotHolds) : [];
  const rescheduleRequest =
    parseInterviewRescheduleContext(interview?.rescheduleContext ?? null) ??
    (pendingApprovalSet
      ? {
          requestedAt: interview?.updatedAt.toISOString() ?? new Date().toISOString(),
          requestedBy: "candidate" as const,
          rescheduleNotes: "",
          approvalStatus: "pending" as const,
          proposedSlots: [],
        }
      : null);
  const proposedSlots =
    rescheduleRequest?.approvalStatus === "declined"
      ? openOfferSet
        ? mapInterviewSlots(openOfferSet.slotHolds)
        : []
      : pendingApprovalSet
        ? mapInterviewSlots(pendingApprovalSet.slotHolds)
        : [];

  return {
    id: application.id,
    fullName: application.fullName,
    email: application.email,
    linkedInUrl: application.linkedInUrl ?? undefined,
    portfolioUrl: application.portfolioUrl ?? undefined,
    jobTitle: application.jobOpening.title,
    stage: application.stage,
    score: screening?.fitScore ?? 0,
    submittedAt: application.submittedAt.toISOString(),
    location: application.candidate.location ?? "Unknown",
    profile: {
      headline: application.candidate.title ?? "",
      preferredLocation: application.candidate.location ?? "",
      skills: profileMetadata.skills,
      desiredSalaryMin: profileMetadata.desiredSalaryMin,
      desiredSalaryMax: profileMetadata.desiredSalaryMax,
      avatarUrl,
    },
    fitSummary: screening?.rationale ?? "Screening pending.",
    strengths: screening?.strengths ?? [],
    gaps: screening?.gaps ?? [],
    statusHistory: parseStatusHistory(application.statusHistory),
    research: {
      brief: research?.candidateBrief ?? "Research pending.",
      githubSummary: research?.githubSummary ?? "Not yet researched.",
      linkedInSummary: research?.linkedInSummary ?? "Not yet researched.",
      xSummary: research?.xSummary ?? "Not yet researched.",
      discrepancies: research?.discrepancyFlags ?? [],
      completeness: (research?.completeness as "complete" | "partial") ?? "partial",
      sources: Array.isArray(research?.sources)
        ? (research?.sources as { label: string; href: string }[])
        : [],
    },
    interview: interview
      ? {
          id: interview.id,
          interviewerName: interview.interviewerName,
          interviewerEmail: interview.interviewerEmail,
          status: interview.status,
          offeredSlots,
          rescheduleRequest: rescheduleRequest
            ? {
                ...rescheduleRequest,
                proposedSlots,
              }
            : undefined,
          confirmedAt: interview.confirmedAt?.toISOString(),
          meetingUrl: interview.meetingUrl ?? undefined,
          transcriptSummary: interview.transcript?.summary,
          transcriptExcerpt: interview.transcript?.transcript.slice(0, 180),
          transcriptText: interview.transcript?.transcript,
          transcriptTurns: parseTranscriptTurns(interview.transcript?.transcriptJson ?? null),
          transcriptDecision: parseTranscriptDecision(interview.transcript?.transcriptJson ?? null),
        }
      : getQueuedInterviewPlaceholder(application.id),
    offer: offer
      ? {
          id: offer.id,
          status: offer.status,
          startDate: offer.startDate.toISOString(),
          baseSalary: offer.baseSalary,
          bonus: offer.bonus ?? "",
          equity: offer.equity ?? "",
          managerName: offer.managerName,
          managerGreeting:
            application.candidate.managerGreeting ??
            "We already have your first-week plan ready.",
          customTerms: offer.customTerms ?? "",
        }
      : undefined,
  };
}

async function syncOfferSignaturesForApplications(applications: CandidateApplication[]) {
  const offerIds = Array.from(
    new Set(
      applications.flatMap((application) =>
        application.offerDrafts
          .filter((offer) => Boolean(offer.docusignEnvelopeId) && offer.status === "sent")
          .map((offer) => offer.id),
      ),
    ),
  );

  if (offerIds.length === 0) {
    return false;
  }

  await syncOutstandingOfferSignatures({ offerIds });
  return true;
}

function mapJobOpeningToRecord(job: Prisma.JobOpeningGetPayload<Record<string, never>>): JobRecord {
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

const listJobsFromDatabase = unstable_cache(
  async () => {
    return withDatabaseFallback(async () => {
      const jobs = await prisma.jobOpening.findMany({
        where: { status: { not: "closed" } },
        orderBy: [{ displayOrder: "asc" }, { createdAt: "desc" }],
      });

      return jobs.map(mapJobOpeningToRecord);
    }, () => null);
  },
  ["job-openings"],
  { revalidate: 300 },
);

const getJobBySlugFromDatabase = unstable_cache(
  async (slug: string) => {
    return withDatabaseFallback(async () => {
      const job = await prisma.jobOpening.findUnique({
        where: { slug },
      });

      return job ? mapJobOpeningToRecord(job) : null;
    }, () => null);
  },
  ["job-opening-by-slug"],
  { revalidate: 300 },
);

const getJobByIdFromDatabase = unstable_cache(
  async (id: string) => {
    return withDatabaseFallback(async () => {
      const job = await prisma.jobOpening.findUnique({
        where: { id },
      });

      return job ? mapJobOpeningToRecord(job) : null;
    }, () => null);
  },
  ["job-opening-by-id"],
  { revalidate: 300 },
);

export async function listJobs(): Promise<JobRecord[]> {
  return (await listJobsFromDatabase()) ?? fallbackJobCatalog;
}

export async function listAdminJobs(): Promise<JobRecord[]> {
  return withDatabaseFallback(async () => {
    const jobs = await prisma.jobOpening.findMany({
      orderBy: [{ displayOrder: "asc" }, { createdAt: "desc" }],
    });

    return jobs.map(mapJobOpeningToRecord);
  }, () =>
    [...fallbackJobCatalog].sort(
      (left, right) => new Date(right.postedAt).getTime() - new Date(left.postedAt).getTime(),
    ),
  );
}

export async function getJobBySlug(slug: string) {
  return (
    (await getJobBySlugFromDatabase(slug)) ??
    fallbackJobCatalog.find((job) => job.slug === slug) ??
    null
  );
}

export async function getJobById(id: string) {
  return (
    (await getJobByIdFromDatabase(id)) ??
    fallbackJobCatalog.find((job) => job.id === id) ??
    null
  );
}

export async function listCandidates(): Promise<CandidateRecord[]> {
  return withDatabaseFallback(async () => {
    let applications = await prisma.application.findMany({
      include: candidateApplicationInclude,
      orderBy: { submittedAt: "desc" },
    });

    if (await syncOfferSignaturesForApplications(applications)) {
      applications = await prisma.application.findMany({
        include: candidateApplicationInclude,
        orderBy: { submittedAt: "desc" },
      });
    }

    return Promise.all(applications.map(toCandidateRecord));
  }, () => []);
}

export async function getCandidateById(id: string) {
  return withDatabaseFallback(async () => {
    let application = await prisma.application.findFirst({
      where: {
        OR: [
          { id },
          { interviews: { some: { id } } },
        ],
      },
      include: candidateApplicationInclude,
    });

    if (application && (await syncOfferSignaturesForApplications([application]))) {
      application = await prisma.application.findFirst({
        where: {
          OR: [
            { id },
            { interviews: { some: { id } } },
          ],
        },
        include: candidateApplicationInclude,
      });
    }

    return application ? await toCandidateRecord(application) : null;
  }, () => null);
}

export async function getCandidateByInterviewId(id: string) {
  return withDatabaseFallback(async () => {
    let application = await prisma.application.findFirst({
      where: {
        interviews: { some: { id } },
      },
      include: candidateApplicationInclude,
    });

    if (application && (await syncOfferSignaturesForApplications([application]))) {
      application = await prisma.application.findFirst({
        where: {
          interviews: { some: { id } },
        },
        include: candidateApplicationInclude,
      });
    }

    return application ? await toCandidateRecord(application) : null;
  }, () => null);
}

export async function getCandidateByOfferId(id: string) {
  return withDatabaseFallback(async () => {
    let application = await prisma.application.findFirst({
      where: {
        offerDrafts: { some: { id } },
      },
      include: candidateApplicationInclude,
    });

    if (application && (await syncOfferSignaturesForApplications([application]))) {
      application = await prisma.application.findFirst({
        where: {
          offerDrafts: { some: { id } },
        },
        include: candidateApplicationInclude,
      });
    }

    return application ? await toCandidateRecord(application) : null;
  }, () => null);
}

export async function listCandidatesByEmail(email: string): Promise<CandidateRecord[]> {
  return withDatabaseFallback(async () => {
    let applications = await prisma.application.findMany({
      where: { email },
      include: candidateApplicationInclude,
      orderBy: { submittedAt: "desc" },
    });

    if (await syncOfferSignaturesForApplications(applications)) {
      applications = await prisma.application.findMany({
        where: { email },
        include: candidateApplicationInclude,
        orderBy: { submittedAt: "desc" },
      });
    }

    return Promise.all(applications.map(toCandidateRecord));
  }, () => []);
}

export async function listCandidatesFiltered(filters: {
  roleId?: string;
  stage?: string;
  dateFrom?: string;
  dateTo?: string;
}): Promise<CandidateRecord[]> {
  const candidates = await listCandidates();
  return candidates.filter((candidate) => {
    if (filters.roleId && candidate.jobTitle !== filters.roleId) return false;
    if (filters.stage && candidate.stage !== (filters.stage as ApplicationStageKey)) return false;
    if (filters.dateFrom && candidate.submittedAt < filters.dateFrom) return false;
    if (filters.dateTo && candidate.submittedAt > filters.dateTo) return false;
    return true;
  });
}

export async function listOfferDrafts() {
  return withDatabaseFallback(async () => {
    let offers = await prisma.offerDraft.findMany({
      include: {
        application: {
          include: {
            candidate: true,
            jobOpening: true,
          },
        },
      },
      orderBy: [{ updatedAt: "desc" }, { createdAt: "desc" }],
    });

    const offerIds = offers
      .filter((offer) => Boolean(offer.docusignEnvelopeId) && offer.status === "sent")
      .map((offer) => offer.id);

    if (offerIds.length > 0) {
      await syncOutstandingOfferSignatures({ offerIds });
      offers = await prisma.offerDraft.findMany({
        include: {
          application: {
            include: {
              candidate: true,
              jobOpening: true,
            },
          },
        },
        orderBy: [{ updatedAt: "desc" }, { createdAt: "desc" }],
      });
    }

    return offers;
  }, () => []);
}

export async function getOfferDraftById(id: string) {
  return withDatabaseFallback(async () => {
    let offer = await prisma.offerDraft.findUnique({
      where: { id },
      include: {
        application: {
          include: {
            candidate: true,
            jobOpening: true,
          },
        },
      },
    });

    if (offer && offer.docusignEnvelopeId && ["sent", "signed"].includes(offer.status)) {
      await syncOutstandingOfferSignatures({ offerIds: [offer.id] });
      offer = await prisma.offerDraft.findUnique({
        where: { id },
        include: {
          application: {
            include: {
              candidate: true,
              jobOpening: true,
            },
          },
        },
      });
    }

    return offer;
  }, () => null);
}

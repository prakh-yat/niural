import "server-only";

import { demoCandidates, demoJobs } from "@/lib/demo-data";
import type { CandidateRecord, JobRecord } from "@/lib/domain";
import { envFlags } from "@/lib/env";
import { prisma } from "@/lib/prisma";

export async function listJobs(): Promise<JobRecord[]> {
  if (!envFlags.hasDatabase) {
    return demoJobs;
  }

  const jobs = await prisma.jobOpening.findMany({
    where: { status: { not: "closed" } },
    orderBy: { displayOrder: "asc" },
  });

  return jobs.map((job) => ({
    id: job.id,
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
    aiLeverageSummary: job.aiLeverageSummary ?? "",
    compensationBand: job.compensationBand ?? "Competitive",
    status: job.status,
  }));
}

export async function getJobBySlug(slug: string) {
  const jobs = await listJobs();
  return jobs.find((job) => job.slug === slug) ?? null;
}

export async function getJobById(id: string) {
  const jobs = await listJobs();
  return jobs.find((job) => job.id === id) ?? null;
}

export async function listCandidates(): Promise<CandidateRecord[]> {
  if (!envFlags.hasDatabase) {
    return demoCandidates;
  }

  const applications = await prisma.application.findMany({
    include: {
      candidate: true,
      screeningResult: true,
      researchProfile: true,
      interviews: {
        include: {
          offerSets: {
            include: {
              slotHolds: true,
            },
          },
          transcript: true,
        },
      },
      offerDrafts: { orderBy: { createdAt: "desc" }, take: 1 },
      jobOpening: true,
    },
    orderBy: { submittedAt: "desc" },
  });

  return applications.map((application) => {
    const interview = application.interviews[0];
    const offer = application.offerDrafts[0];
    const research = application.researchProfile;
    const screening = application.screeningResult;

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
      fitSummary: screening?.rationale ?? "Screening pending.",
      strengths: screening?.strengths ?? [],
      gaps: screening?.gaps ?? [],
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
            offeredSlots:
              interview.offerSets[0]?.slotHolds.map((hold) => ({
                label: `${hold.startAt.toISOString()} - ${hold.endAt.toISOString()}`,
                startsAt: hold.startAt.toISOString(),
                endsAt: hold.endAt.toISOString(),
                status: hold.status,
              })) ?? [],
            confirmedAt: interview.confirmedAt?.toISOString(),
            meetingUrl: interview.meetingUrl ?? undefined,
            transcriptSummary: interview.transcript?.summary,
            transcriptExcerpt: interview.transcript?.transcript.slice(0, 180),
          }
        : {
            id: `pending-${application.id}`,
            interviewerName: "Leo Bennett",
            interviewerEmail: "leo.bennett@niural-demo.com",
            status: "queued",
            offeredSlots: [],
          },
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
  });
}

export async function getCandidateById(id: string) {
  const candidates = await listCandidates();
  return candidates.find((candidate) => candidate.id === id || candidate.interview.id === id) ?? null;
}

export async function getCandidateByInterviewId(id: string) {
  const candidates = await listCandidates();
  return candidates.find((candidate) => candidate.interview.id === id) ?? null;
}

export async function getCandidateByOfferId(id: string) {
  const candidates = await listCandidates();
  return candidates.find((candidate) => candidate.offer?.id === id) ?? null;
}

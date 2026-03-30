import { NextResponse } from "next/server";

import { resetMockCalendar } from "@/lib/integrations/google-calendar-mock";
import { envFlags } from "@/lib/env";
import { fallbackJobCatalog } from "@/lib/job-catalog";
import { prisma } from "@/lib/prisma";

function buildJobPayload(job: (typeof fallbackJobCatalog)[number], displayOrder: number) {
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
    displayOrder,
    aiLeverageSummary: job.aiLeverageSummary || null,
  };
}

export async function POST() {
  if (!envFlags.isE2E) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  await prisma.$transaction([
    prisma.transcriptArtifact.deleteMany(),
    prisma.slotHold.deleteMany(),
    prisma.slotOfferSet.deleteMany(),
    prisma.interview.deleteMany(),
    prisma.offerDraft.deleteMany(),
    prisma.researchProfile.deleteMany(),
    prisma.screeningResult.deleteMany(),
    prisma.resumeAsset.deleteMany(),
    prisma.application.deleteMany(),
    prisma.profile.deleteMany(),
    prisma.integrationEvent.deleteMany(),
    prisma.integrationCredential.deleteMany(),
    prisma.workflowJob.deleteMany(),
    prisma.jobOpening.deleteMany(),
  ]);

  const createdJobs = await Promise.all(
    fallbackJobCatalog.slice(0, 6).map((job, index) =>
      prisma.jobOpening.create({
        data: buildJobPayload(job, index + 1),
      }),
    ),
  );

  await prisma.integrationCredential.create({
    data: {
      provider: "google_calendar",
      lookupKey: "primary_interviewer",
      refreshToken: "e2e-google-refresh-token",
      metadata: {
        name: "E2E Recruiter",
        email: "recruiter@niural-e2e.local",
        connectedAt: new Date().toISOString(),
      },
    },
  });

  await resetMockCalendar();

  return NextResponse.json({
    ok: true,
    jobs: createdJobs.map((job) => ({
      id: job.id,
      slug: job.slug,
      title: job.title,
    })),
  });
}

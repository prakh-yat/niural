import { NextResponse } from "next/server";

import { envFlags } from "@/lib/env";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
  if (!envFlags.isE2E) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const url = new URL(request.url);
  const email = url.searchParams.get("email");
  const interviewId = url.searchParams.get("interviewId");

  if (!email && !interviewId) {
    return NextResponse.json({ error: "Missing email or interviewId" }, { status: 400 });
  }

  const applications = await prisma.application.findMany({
    where: email
      ? { email }
      : {
          interviews: {
            some: {
              id: interviewId ?? undefined,
            },
          },
        },
    include: {
      interviews: {
        include: {
          offerSets: {
            include: {
              slotHolds: true,
            },
            orderBy: { createdAt: "desc" },
          },
        },
        orderBy: { createdAt: "desc" },
      },
    },
    orderBy: { submittedAt: "asc" },
  });

  return NextResponse.json({
    ok: true,
    applications: applications.map((application) => ({
      id: application.id,
      email: application.email,
      role: application.roleSelectionSnapshot,
      stage: application.stage,
      stageReason: application.stageReason,
      interviews: application.interviews.map((interview) => ({
        id: interview.id,
        status: interview.status,
        googleEventId: interview.googleEventId,
        candidateRsvp: interview.candidateRsvp,
        startsAt: interview.startsAt?.toISOString() ?? null,
        endsAt: interview.endsAt?.toISOString() ?? null,
        meetingUrl: interview.meetingUrl,
        offerSets: interview.offerSets.map((offerSet) => ({
          id: offerSet.id,
          status: offerSet.status,
          holdCount: offerSet.slotHolds.length,
          holds: offerSet.slotHolds.map((hold) => ({
            id: hold.id,
            status: hold.status,
            startsAt: hold.startAt.toISOString(),
            endsAt: hold.endAt.toISOString(),
          })),
        })),
      })),
    })),
  });
}

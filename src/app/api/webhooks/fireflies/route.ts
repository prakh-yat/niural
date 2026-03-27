import { NextResponse } from "next/server";

import { env, envFlags } from "@/lib/env";
import { fetchFirefliesTranscript, verifyFirefliesSignature } from "@/lib/integrations/fireflies";
import { prisma } from "@/lib/prisma";
import { recordIntegrationEvent } from "@/lib/server/workflows";

export async function POST(request: Request) {
  const rawBody = await request.text();
  const signature = request.headers.get("x-hub-signature");

  if (env.FIREFLIES_WEBHOOK_SECRET) {
    const verified = verifyFirefliesSignature({ body: rawBody, signature });
    if (!verified) {
      return NextResponse.json({ error: "Invalid Fireflies signature" }, { status: 401 });
    }
  }

  const payload = JSON.parse(rawBody || "{}");
  const meetingId = String(payload.meeting_id ?? payload.meetingId ?? "");
  const clientReferenceId = String(
    payload.client_reference_id ?? payload.clientReferenceId ?? "",
  );

  if (!meetingId) {
    return NextResponse.json({ error: "Missing Fireflies meeting id" }, { status: 400 });
  }

  const transcript = await fetchFirefliesTranscript(meetingId);

  if (envFlags.hasDatabase) {
    let interviewId = clientReferenceId || "";

    if (!interviewId) {
      const candidateEmail = transcript.attendeeEmails.find(Boolean);
      const linkedInterview = await prisma.interview.findFirst({
        where: {
          OR: [
            transcript.meetingLink ? { meetingUrl: transcript.meetingLink } : undefined,
            candidateEmail
              ? {
                  application: {
                    email: candidateEmail,
                  },
                }
              : undefined,
          ].filter(Boolean) as object[],
        },
        orderBy: { createdAt: "desc" },
      });

      interviewId = linkedInterview?.id ?? "";
    }

    if (interviewId) {
    await prisma.transcriptArtifact.upsert({
      where: { interviewId },
      update: {
        provider: "fireflies",
        providerMeetingId: transcript.providerMeetingId,
        summary: transcript.summary,
        transcript: transcript.transcript,
        transcriptJson: transcript.transcriptJson,
      },
      create: {
        interviewId,
        provider: "fireflies",
        providerMeetingId: transcript.providerMeetingId,
        summary: transcript.summary,
        transcript: transcript.transcript,
        transcriptJson: transcript.transcriptJson,
      },
    });
    }
  }

  await recordIntegrationEvent("fireflies", "transcript.received", "success", payload);

  return NextResponse.json({ ok: true });
}

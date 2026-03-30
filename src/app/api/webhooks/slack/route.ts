import { NextResponse } from "next/server";

import { composeSlackWelcome } from "@/lib/integrations/openrouter";
import { notifyHrChannel, sendWelcomeDm, verifySlackSignature } from "@/lib/integrations/slack";
import { env, envFlags } from "@/lib/env";
import { prisma } from "@/lib/prisma";
import { updateApplicationStage } from "@/lib/server/pipeline";
import { recordIntegrationEvent } from "@/lib/server/workflows";

export async function POST(request: Request) {
  const rawBody = await request.text();
  const signature = request.headers.get("x-slack-signature");
  const timestamp = request.headers.get("x-slack-request-timestamp");

  if (envFlags.hasSlackWebhook && !verifySlackSignature({ body: rawBody, signature, timestamp })) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  const payload = JSON.parse(rawBody || "{}");

  if (payload.type === "url_verification") {
    return NextResponse.json({ challenge: payload.challenge });
  }

  if (payload.event?.type === "team_join") {
    const email = payload.event.user?.profile?.email as string | undefined;
    const userId = payload.event.user?.id as string | undefined;

    if (email && userId && envFlags.hasDatabase) {
      const application = await prisma.application.findFirst({
        where: { email },
        include: {
          candidate: true,
          jobOpening: true,
          offerDrafts: { orderBy: { createdAt: "desc" }, take: 1 },
        },
      });

      const offer = application?.offerDrafts[0];
      if (application && offer) {
        const message = await composeSlackWelcome({
          candidateName: application.fullName,
          roleTitle: offer.jobTitle,
          startDate: offer.startDate.toISOString(),
          managerGreeting:
            application.candidate.managerGreeting ??
            "Your first week is already mapped out and ready.",
          managerName: offer.managerName,
          team: application.jobOpening?.team,
          candidateHeadline: application.candidate.title ?? undefined,
          candidateLocation: application.candidate.location ?? undefined,
          resourceUrl: env.SLACK_ONBOARDING_RESOURCE_URL,
        });

        await sendWelcomeDm(userId, message);
        await notifyHrChannel(
          `Candidate onboarded in Slack: ${application.fullName} (${offer.jobTitle}) · starts ${offer.startDate.toISOString().slice(0, 10)}`,
        );

        await updateApplicationStage({
          applicationId: application.id,
          stage: "onboarded",
          note: "Candidate joined Slack and received onboarding welcome.",
          actor: "system",
          visibility: "admin",
        });
      }
    }
  }

  await recordIntegrationEvent("slack", "event.received", "success", payload);
  return NextResponse.json({ ok: true });
}

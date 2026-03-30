import { NextResponse } from "next/server";

import { PIPELINE_STAGES, type PipelineStageKey } from "@/lib/domain";
import { prisma } from "@/lib/prisma";
import { createOfferDraft } from "@/lib/server/applications";
import { getViewer } from "@/lib/server/auth";
import { sendTrackedEmail } from "@/lib/server/email";
import { updateApplicationStage } from "@/lib/server/pipeline";

export async function POST(request: Request) {
  const viewer = await getViewer("admin");

  if (!viewer) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await request.json()) as {
    applicationId?: string;
    stage?: PipelineStageKey;
    note?: string;
  };

  if (
    !body.applicationId ||
    !body.stage ||
    !PIPELINE_STAGES.includes(body.stage) ||
    !body.note?.trim()
  ) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  if (body.stage === "offer_drafting") {
    await createOfferDraft({
      applicationId: body.applicationId,
      stageNote: body.note.trim(),
      stageActor: "admin",
      stageVisibility: "admin",
    });
  } else {
    await updateApplicationStage({
      applicationId: body.applicationId,
      stage: body.stage,
      note: body.note.trim(),
      actor: "admin",
      visibility: "admin",
    });
  }

  if (body.stage === "rejected") {
    const application = await prisma.application.findUnique({
      where: { id: body.applicationId },
      select: {
        id: true,
        fullName: true,
        email: true,
        roleSelectionSnapshot: true,
      },
    });

    if (application) {
      await sendTrackedEmail({
        to: application.email,
        subject: "Update on your Niural application",
        html: `<p>Hi ${application.fullName},</p><p>Thank you for your interest in the ${application.roleSelectionSnapshot} role at Niural.</p><p>After review, we will not be moving forward with your application at this time.</p><p>We appreciate your time and wish you the best in your search.</p><p>Niural Talent Team</p>`,
        text: `Hi ${application.fullName},\n\nThank you for your interest in the ${application.roleSelectionSnapshot} role at Niural.\n\nAfter review, we will not be moving forward with your application at this time.\n\nWe appreciate your time and wish you the best in your search.\n\nNiural Talent Team`,
        eventType: "application.rejection_email",
        payload: {
          applicationId: application.id,
          recipientRole: "candidate",
        },
      });
    }
  }

  return NextResponse.json({ ok: true });
}

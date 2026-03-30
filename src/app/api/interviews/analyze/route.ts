import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";

import { buildAdminUrl } from "@/lib/portal";
import { analyzeInterviewTranscriptSubmission } from "@/lib/server/interviews";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const applicationId = typeof body?.applicationId === "string" ? body.applicationId : undefined;
    const interviewId = typeof body?.interviewId === "string" ? body.interviewId : undefined;
    const fallbackConversation =
      body && typeof body === "object" && !Array.isArray(body)
        ? Object.fromEntries(
            Object.entries(body as Record<string, unknown>).filter(
              ([key]) => key !== "applicationId" && key !== "interviewId" && key !== "conversation",
            ),
          )
        : body;
    const result = await analyzeInterviewTranscriptSubmission({
      applicationId,
      interviewId,
      conversation:
        body?.conversation && typeof body.conversation === "object"
          ? body.conversation
          : fallbackConversation,
    });

    revalidatePath("/niural-admin");
    revalidatePath("/niural-admin/pipeline");
    revalidatePath("/niural-admin/offers");
    revalidatePath(buildAdminUrl(`/candidates/${result.applicationId}`));
    if (result.offerId) {
      revalidatePath(buildAdminUrl(`/offers/${result.offerId}`));
    }

    return NextResponse.json({
      ok: true,
      applicationId: result.applicationId,
      interviewId: result.interviewId,
      decision: result.decision,
      offerId: result.offerId,
      summary: result.summary,
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "Interview analysis failed.",
      },
      { status: 400 },
    );
  }
}

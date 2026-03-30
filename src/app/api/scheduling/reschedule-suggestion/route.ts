import { NextResponse } from "next/server";

import { buildAppUrl } from "@/lib/portal";
import { FLASH_COOKIE_NAMES, setFlashMessage } from "@/lib/server/flash";
import { requestNextCandidateRescheduleSuggestion } from "@/lib/server/scheduling";

export async function POST(request: Request) {
  const referer = request.headers.get("referer");

  try {
    const formData = await request.formData();
    const interviewId = String(formData.get("interviewId") ?? "");

    if (!interviewId) {
      throw new Error("Interview not found for the next suggestion.");
    }

    await requestNextCandidateRescheduleSuggestion({ interviewId });

    const response = NextResponse.redirect(
      referer ? new URL(referer) : new URL(buildAppUrl(`/interviews/${interviewId}`), request.url),
      { status: 303 },
    );
    setFlashMessage(response, FLASH_COOKIE_NAMES.candidateInterview, {
      tone: "success",
      message: "A new held interview option is ready for you to review.",
    });
    return response;
  } catch (error) {
    const response = NextResponse.redirect(
      referer ? new URL(referer) : new URL(buildAppUrl("/interviews"), request.url),
      { status: 303 },
    );
    setFlashMessage(response, FLASH_COOKIE_NAMES.candidateInterview, {
      tone: "error",
      message:
        error instanceof Error ? error.message : "A new interview option could not be generated.",
    });
    return response;
  }
}

import { NextResponse } from "next/server";

import { buildAppUrl } from "@/lib/portal";
import { FLASH_COOKIE_NAMES, setFlashMessage } from "@/lib/server/flash";
import { confirmInterviewSlot } from "@/lib/server/scheduling";

export async function POST(request: Request) {
  const referer = request.headers.get("referer");

  try {
    const formData = await request.formData();
    const interviewId = String(formData.get("interviewId") ?? "");
    const slotStart = String(formData.get("slotStart") ?? "");
    const slotEnd = String(formData.get("slotEnd") ?? "");

    await confirmInterviewSlot({ interviewId, slotStart, slotEnd });

    const response = NextResponse.redirect(
      new URL(buildAppUrl(`/interviews/${interviewId}`), request.url),
      { status: 303 },
    );
    setFlashMessage(response, FLASH_COOKIE_NAMES.candidateInterview, {
      tone: "success",
      message: "Interview confirmed. The calendar invite and meeting link are ready.",
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
        error instanceof Error ? error.message : "Interview confirmation could not be completed.",
    });
    return response;
  }
}

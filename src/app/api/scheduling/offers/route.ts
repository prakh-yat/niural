import { NextResponse } from "next/server";

import { buildAdminUrl, buildAppUrl } from "@/lib/portal";
import { getViewer } from "@/lib/server/auth";
import { FLASH_COOKIE_NAMES, setFlashMessage } from "@/lib/server/flash";
import {
  generateInterviewOffers,
  requestAlternativeInterviewOptions,
} from "@/lib/server/scheduling";

export async function POST(request: Request) {
  const referer = request.headers.get("referer");
  const isAdminSurface = referer?.includes("/niural-admin/") ?? false;

  try {
    const formData = await request.formData();
    const candidateId = formData.get("candidateId");
    const interviewId = formData.get("interviewId");
    const rescheduleNotes = formData.get("rescheduleNotes");
    const viewer = isAdminSurface ? await getViewer("admin") : null;

    if (isAdminSurface && !viewer) {
      throw new Error("Admin access is required to send scheduling invites.");
    }

    if (isAdminSurface) {
      await generateInterviewOffers({
        applicationId: candidateId ? String(candidateId) : undefined,
        interviewId: interviewId ? String(interviewId) : undefined,
        rescheduleNotes: rescheduleNotes ? String(rescheduleNotes) : undefined,
        baseUrl: new URL(request.url).origin,
        requestedBy: "admin",
        notifyCandidate: true,
      });
    } else {
      if (!interviewId) {
        throw new Error("Interview not found for alternative scheduling.");
      }

      await requestAlternativeInterviewOptions({
        interviewId: String(interviewId),
        rescheduleNotes: rescheduleNotes ? String(rescheduleNotes) : undefined,
        baseUrl: new URL(request.url).origin,
      });
    }

    const fallbackUrl = interviewId
      ? new URL(buildAppUrl(`/interviews/${String(interviewId)}`), request.url).toString()
      : new URL(buildAdminUrl("/"), request.url).toString();

    const response = NextResponse.redirect(referer ?? fallbackUrl, { status: 303 });
    setFlashMessage(
      response,
      isAdminSurface ? FLASH_COOKIE_NAMES.adminCandidate : FLASH_COOKIE_NAMES.candidateInterview,
      {
        tone: "success",
        message: isAdminSurface
          ? "Scheduling invite sent with availability from the connected Google Calendar."
          : "Your request was sent to the interviewer. Updated options will appear after approval.",
      },
    );
    return response;
  } catch (error) {
    const fallbackUrl = new URL(buildAdminUrl("/"), request.url).toString();
    const response = NextResponse.redirect(referer ?? fallbackUrl, { status: 303 });
    setFlashMessage(
      response,
      isAdminSurface ? FLASH_COOKIE_NAMES.adminCandidate : FLASH_COOKIE_NAMES.candidateInterview,
      {
        tone: "error",
        message:
          error instanceof Error ? error.message : "Interview scheduling could not be completed.",
      },
    );
    return response;
  }
}

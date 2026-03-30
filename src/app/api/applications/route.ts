import { NextResponse, after } from "next/server";

import { processSubmittedApplication, submitApplication } from "@/lib/server/applications";
import { FLASH_COOKIE_NAMES, setFlashMessage } from "@/lib/server/flash";

export async function POST(request: Request) {
  const url = new URL(request.url);

  try {
    const formData = await request.formData();
    const result = await submitApplication(formData, url.origin);
    const pendingWork = result.pendingWork;

    if (pendingWork) {
      after(async () => {
        await processSubmittedApplication(pendingWork);
      });
    }

    const redirectUrl = new URL(result.redirectPath, url.origin);
    const response = NextResponse.redirect(redirectUrl, { status: 303 });
    setFlashMessage(response, FLASH_COOKIE_NAMES.jobApplication, {
      tone: "success",
      message: "Application received. Our team will review it and get back to you shortly.",
    });
    return response;
  } catch (error) {
    console.error("[applications] Submission failed:", error);
    const message = error instanceof Error ? error.message : "Application submission failed.";
    const referer = request.headers.get("referer");
    const redirectTo = referer ? new URL(referer) : new URL("/", url.origin);
    const response = NextResponse.redirect(redirectTo, { status: 303 });
    setFlashMessage(response, FLASH_COOKIE_NAMES.jobApplication, {
      tone: "error",
      message,
    });
    return response;
  }
}

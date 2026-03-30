import { NextResponse } from "next/server";

import { getGoogleConsentUrl } from "@/lib/integrations/google-calendar";
import { FLASH_COOKIE_NAMES, setFlashMessage } from "@/lib/server/flash";

export async function GET(request: Request) {
  const consentUrl = getGoogleConsentUrl();
  if (consentUrl) {
    return NextResponse.redirect(consentUrl);
  }

  const response = NextResponse.redirect(new URL("/niural-admin/settings", request.url));
  setFlashMessage(response, FLASH_COOKIE_NAMES.adminSettings, {
    tone: "error",
    message: "Google Calendar environment variables are not configured.",
  });
  return response;
}

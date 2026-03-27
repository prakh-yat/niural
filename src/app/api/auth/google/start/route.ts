import { NextResponse } from "next/server";

import { getGoogleConsentUrl } from "@/lib/integrations/google-calendar";

export async function GET(request: Request) {
  const consentUrl = getGoogleConsentUrl();
  return NextResponse.redirect(consentUrl ?? new URL("/settings/integrations/google", request.url));
}

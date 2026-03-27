import { NextResponse } from "next/server";

import { exchangeGoogleCode } from "@/lib/integrations/google-calendar";
import { upsertGoogleRefreshToken } from "@/lib/server/workflows";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");

  if (!code) {
    return NextResponse.redirect(new URL("/settings/integrations/google?error=missing_code", request.url));
  }

  const tokens = await exchangeGoogleCode(code);
  if (tokens.refresh_token) {
    await upsertGoogleRefreshToken(tokens.refresh_token);
  }

  const redirectTo = new URL("/settings/integrations/google", request.url);
  redirectTo.searchParams.set("connected", "1");
  return NextResponse.redirect(redirectTo);
}

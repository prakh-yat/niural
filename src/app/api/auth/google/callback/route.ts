import { NextResponse } from "next/server";

import { exchangeGoogleCode, getGoogleCalendarAccount } from "@/lib/integrations/google-calendar";
import { FLASH_COOKIE_NAMES, setFlashMessage } from "@/lib/server/flash";
import { upsertGoogleRefreshToken } from "@/lib/server/workflows";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");

  if (!code) {
    const response = NextResponse.redirect(new URL("/niural-admin/settings", request.url));
    setFlashMessage(response, FLASH_COOKIE_NAMES.adminSettings, {
      tone: "error",
      message: "Google connection failed because the callback code was missing.",
    });
    return response;
  }

  const tokens = await exchangeGoogleCode(code);
  const account = await getGoogleCalendarAccount({
    accessToken: tokens.access_token ?? null,
    refreshToken: tokens.refresh_token ?? null,
  });

  if (tokens.refresh_token) {
    await upsertGoogleRefreshToken({
      refreshToken: tokens.refresh_token,
      accessToken: tokens.access_token ?? null,
      metadata: {
        email: account?.email ?? null,
        name: account?.name ?? null,
        picture: account?.picture ?? null,
        connectedAt: new Date().toISOString(),
      },
    });
  }

  const response = NextResponse.redirect(new URL("/niural-admin/settings", request.url));
  setFlashMessage(response, FLASH_COOKIE_NAMES.adminSettings, {
    tone: "success",
    message: account?.email
      ? `Google Calendar connected for ${account.email}.`
      : "Google Calendar connected.",
  });
  return response;
}

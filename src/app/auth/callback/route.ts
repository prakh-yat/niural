import { NextResponse } from "next/server";
import { cookies } from "next/headers";

import { envFlags } from "@/lib/env";
import { FLASH_COOKIE_NAMES, setFlashMessage } from "@/lib/server/flash";
import { resolvePortalRole, setActivePortalRole } from "@/lib/server/auth";
import { resolvePortalSessionScope } from "@/lib/supabase/cookies";
import { createSupabaseServerClient } from "@/lib/supabase/server";

function buildSignInUrl(request: Request, role: string) {
  return new URL(role === "admin" ? "/niural-admin/login" : "/auth/sign-in", request.url);
}

function flashCookieName(role: string) {
  return role === "admin" ? FLASH_COOKIE_NAMES.adminAuth : FLASH_COOKIE_NAMES.candidateAuth;
}

function redirectWithError(request: Request, role: string, message: string) {
  const response = NextResponse.redirect(buildSignInUrl(request, role));
  setFlashMessage(response, flashCookieName(role), {
    tone: "error",
    message,
  });
  return response;
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const tokenHash = url.searchParams.get("token_hash");
  const verificationType = url.searchParams.get("type") ?? "magiclink";
  const next = url.searchParams.get("next") ?? "/app";
  const requestedRole = url.searchParams.get("role");
  const destination = next.startsWith("http") ? next : new URL(next, request.url).toString();
  const role =
    requestedRole === "admin" || requestedRole === "candidate"
      ? requestedRole
      : resolvePortalRole(next);
  const authError = url.searchParams.get("error_description") ?? url.searchParams.get("error");

  if (authError) {
    return redirectWithError(request, role, authError);
  }

  if ((!code && !tokenHash) || !envFlags.hasSupabase) {
    return redirectWithError(request, role, "Unable to complete sign in.");
  }

  const cookieStore = await cookies();
  const response = NextResponse.redirect(new URL(destination));
  const supabase = await createSupabaseServerClient(resolvePortalSessionScope(role));

  if (!supabase) {
    return redirectWithError(request, role, "Authentication service is unavailable.");
  }

  const { error } = tokenHash
    ? await supabase.auth.verifyOtp({
        token_hash: tokenHash,
        type: verificationType as
          | "signup"
          | "invite"
          | "magiclink"
          | "recovery"
          | "email_change"
          | "email",
      })
    : await supabase.auth.exchangeCodeForSession(code!);
  if (error) {
    return redirectWithError(request, role, error.message);
  }

  cookieStore.getAll().forEach((cookie) => {
    response.cookies.set(cookie.name, cookie.value, cookie);
  });
  setActivePortalRole(response, role);

  return response;
}

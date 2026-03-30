import { cache } from "react";
import { redirect } from "next/navigation";
import type { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";

import type { RoleKey } from "@/lib/domain";
import { env, envFlags } from "@/lib/env";
import { sendTransactionalEmail } from "@/lib/integrations/resend";
import { buildAdminUrl, buildAppUrl } from "@/lib/portal";
import {
  getPortalRoleCookieName,
  resolvePortalSessionScope,
  type PortalSessionScope,
} from "@/lib/supabase/cookies";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const ACTIVE_PORTAL_ROLE_COOKIE_MAX_AGE = 60 * 60 * 24 * 30;

export type Viewer = {
  email: string;
  fullName: string;
  role: RoleKey;
  isPreview: boolean;
};

function isRoleKey(value: unknown): value is RoleKey {
  return value === "candidate" || value === "hiring_team" || value === "admin";
}

function normalizePathname(pathOrUrl: string) {
  if (!pathOrUrl) {
    return "/";
  }

  if (pathOrUrl.startsWith("http://") || pathOrUrl.startsWith("https://")) {
    try {
      return new URL(pathOrUrl).pathname;
    } catch {
      return "/";
    }
  }

  return pathOrUrl.startsWith("/") ? pathOrUrl : `/${pathOrUrl}`;
}

export function resolvePortalRole(pathOrUrl: string): RoleKey {
  const pathname = normalizePathname(pathOrUrl);
  return pathname.startsWith("/niural-admin") ? "admin" : "candidate";
}

async function getActivePortalRole(scope: PortalSessionScope) {
  const cookieStore = await cookies();
  const roleCookie = cookieStore.get(getPortalRoleCookieName(scope))?.value;
  return isRoleKey(roleCookie) ? roleCookie : null;
}

export function setActivePortalRole(response: NextResponse, role: RoleKey) {
  const scope = resolvePortalSessionScope(role);
  response.cookies.set(getPortalRoleCookieName(scope), role, {
    path: "/",
    httpOnly: true,
    sameSite: "lax",
    maxAge: ACTIVE_PORTAL_ROLE_COOKIE_MAX_AGE,
  });
}

export function clearActivePortalRole(response: NextResponse, role?: RoleKey) {
  const scopes = role
    ? [resolvePortalSessionScope(role)]
    : (["candidate", "admin"] as const satisfies PortalSessionScope[]);

  scopes.forEach((scope) => {
    response.cookies.set(getPortalRoleCookieName(scope), "", {
      path: "/",
      httpOnly: true,
      sameSite: "lax",
      maxAge: 0,
    });
  });
}

export const getViewer = cache(async (roleHint: RoleKey = "candidate"): Promise<Viewer | null> => {
  if (!envFlags.hasSupabase) {
    return {
      email: `${roleHint}@preview.local`,
      fullName: roleHint === "admin" ? "Preview Admin" : "Preview User",
      role: roleHint,
      isPreview: true,
    };
  }

  const scope = resolvePortalSessionScope(roleHint);
  const supabase = await createSupabaseServerClient(scope);
  if (!supabase) {
    return null;
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user?.email) {
    return null;
  }

  const metadataRole = isRoleKey(user.user_metadata.role) ? user.user_metadata.role : null;
  const role = (await getActivePortalRole(scope)) ?? metadataRole;

  if (!role || role !== roleHint) {
    return null;
  }

  return {
    email: user.email,
    fullName: (user.user_metadata.full_name as string | undefined) ?? user.email.split("@")[0],
    role,
    isPreview: false,
  };
});

export async function requireViewer(roleHint: RoleKey = "candidate") {
  const viewer = await getViewer(roleHint);
  if (!viewer) {
    redirect(roleHint === "admin" ? "/niural-admin/login" : "/auth/sign-in");
  }
  return viewer;
}

function normalizePortalRedirectPath(role: RoleKey, redirectPath?: string) {
  const fallback = role === "candidate" ? "/app" : "/niural-admin";
  const path = redirectPath?.trim() || fallback;
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;

  if (role === "candidate") {
    return normalizedPath.startsWith("/app") ? normalizedPath : buildAppUrl(normalizedPath);
  }

  return normalizedPath.startsWith("/niural-admin")
    ? normalizedPath
    : buildAdminUrl(normalizedPath);
}

export async function requestMagicLink(input: {
  email: string;
  role: RoleKey;
  redirectPath?: string;
  baseUrl?: string;
}) {
  if (!envFlags.hasSupabase) {
    return {
      ok: true,
      mode: "preview" as const,
      message: "Supabase is not configured. Preview mode is active.",
    };
  }

  const baseUrl = input.baseUrl ?? env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  const redirectPath = normalizePortalRedirectPath(input.role, input.redirectPath);
  const oneTimeLink = await generateOneTimeMagicLink({
    email: input.email,
    role: input.role,
    redirectPath,
    baseUrl,
  });

  if (oneTimeLink) {
    if (envFlags.hasResend) {
      try {
        await sendTransactionalEmail({
          to: input.email,
          subject: "Your Niural sign-in link",
          text: [
            "Use this secure sign-in link to access Niural:",
            oneTimeLink,
            "",
            "If you did not request this email, you can safely ignore it.",
          ].join("\n"),
          html: [
            "<div style=\"font-family:Inter,Arial,sans-serif;max-width:560px;margin:0 auto;padding:32px 24px;color:#111827;\">",
            "<p style=\"margin:0 0 12px;font-size:12px;letter-spacing:0.24em;text-transform:uppercase;color:#6b7280;\">Niural</p>",
            "<h1 style=\"margin:0 0 16px;font-size:28px;line-height:1.2;color:#111827;\">Your sign-in link is ready</h1>",
            "<p style=\"margin:0 0 24px;font-size:16px;line-height:1.6;color:#4b5563;\">Use the button below to sign in securely.</p>",
            `<a href="${oneTimeLink}" style="display:inline-block;border-radius:14px;background:linear-gradient(135deg,#7c3aed,#5b21b6);padding:14px 22px;font-size:15px;font-weight:600;color:#ffffff;text-decoration:none;">Sign in to Niural</a>`,
            `<p style="margin:24px 0 0;font-size:13px;line-height:1.6;color:#6b7280;word-break:break-word;">If the button does not work, open this link:<br /><a href="${oneTimeLink}" style="color:#5b21b6;">${oneTimeLink}</a></p>`,
            "<p style=\"margin:24px 0 0;font-size:13px;line-height:1.6;color:#9ca3af;\">If you did not request this email, you can safely ignore it.</p>",
            "</div>",
          ].join(""),
        });

        return {
          ok: true,
          mode: "supabase" as const,
          message: `Magic link sent to ${input.email}.`,
        };
      } catch (error) {
        console.warn(
          `[auth] Failed to send magic link email for ${input.email}: ${error instanceof Error ? error.message : String(error)}`,
        );
      }
    }

    console.info(`[auth] Local magic link for ${input.email}: ${oneTimeLink}`);

    return {
      ok: true,
      mode: "preview" as const,
      message: "Magic link generated for local testing. Check the server log.",
    };
  }

  const supabase = await createSupabaseServerClient();
  if (!supabase) {
    return {
      ok: false,
      mode: "supabase" as const,
      message: "Supabase server client is unavailable.",
    };
  }

  const callbackUrl = new URL("/auth/callback", baseUrl);
  callbackUrl.searchParams.set("role", input.role);
  callbackUrl.searchParams.set("next", redirectPath);

  const { error } = await supabase.auth.signInWithOtp({
    email: input.email,
    options: {
      emailRedirectTo: callbackUrl.toString(),
      data: {
        role: input.role,
      },
    },
  });

  if (error) {
    return { ok: false, mode: "supabase" as const, message: error.message };
  }

  return {
    ok: true,
    mode: "supabase" as const,
    message: `Magic link sent to ${input.email}.`,
  };
}

export async function generateOneTimeMagicLink(input: {
  email: string;
  role: RoleKey;
  redirectPath: string;
  baseUrl?: string;
}) {
  const admin = createSupabaseAdminClient();
  if (!admin || !envFlags.hasSupabaseAdmin) {
    return null;
  }

  const baseUrl = input.baseUrl ?? env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  const finalDestination = normalizePortalRedirectPath(input.role, input.redirectPath);

  const { data, error } = await admin.auth.admin.generateLink({
    type: "magiclink",
    email: input.email,
    options: {
      data: {
        role: input.role,
      },
    },
  });

  if (error) {
    return null;
  }

  const tokenHash = data.properties?.hashed_token;
  if (!tokenHash) {
    return null;
  }

  const callbackUrl = new URL("/auth/callback", baseUrl);
  callbackUrl.searchParams.set("role", input.role);
  callbackUrl.searchParams.set("token_hash", tokenHash);
  callbackUrl.searchParams.set("type", "magiclink");
  callbackUrl.searchParams.set("next", finalDestination);

  return callbackUrl.toString();
}

export function createSupabaseAdminClient() {
  if (!envFlags.hasSupabaseAdmin) {
    return null;
  }

  return createClient(env.NEXT_PUBLIC_SUPABASE_URL!, env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

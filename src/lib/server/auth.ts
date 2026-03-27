import { cache } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@supabase/supabase-js";

import type { RoleKey } from "@/lib/domain";
import { env, envFlags } from "@/lib/env";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export type Viewer = {
  email: string;
  fullName: string;
  role: RoleKey;
  isPreview: boolean;
};

export const getViewer = cache(async (roleHint: RoleKey = "candidate"): Promise<Viewer | null> => {
  if (!envFlags.hasSupabase) {
    return {
      email: `${roleHint}@preview.local`,
      fullName: roleHint === "admin" ? "Preview Admin" : "Preview User",
      role: roleHint,
      isPreview: true,
    };
  }

  const supabase = await createSupabaseServerClient();
  if (!supabase) {
    return null;
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user?.email) {
    return null;
  }

  const role =
    (user.user_metadata.role as RoleKey | undefined) ??
    (roleHint === "candidate" ? "candidate" : "hiring_team");

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
    redirect(`/auth/sign-in?role=${roleHint}`);
  }
  return viewer;
}

export async function requestMagicLink(input: {
  email: string;
  role: RoleKey;
  redirectPath?: string;
}) {
  if (!envFlags.hasSupabase) {
    return {
      ok: true,
      mode: "preview" as const,
      message: "Supabase is not configured. Preview mode is active.",
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

  const redirectTo = new URL(
    input.redirectPath ?? (input.role === "candidate" ? "/candidate" : "/admin"),
    env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000",
  ).toString();

  const { error } = await supabase.auth.signInWithOtp({
    email: input.email,
    options: {
      emailRedirectTo: `${env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"}/auth/callback?next=${encodeURIComponent(
        redirectTo,
      )}`,
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
}) {
  const admin = createSupabaseAdminClient();
  if (!admin || !envFlags.hasSupabaseAdmin) {
    return null;
  }

  const redirectTo = new URL(
    `/auth/callback?next=${encodeURIComponent(input.redirectPath)}`,
    env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000",
  ).toString();

  const { data, error } = await admin.auth.admin.generateLink({
    type: "magiclink",
    email: input.email,
    options: {
      redirectTo,
      data: {
        role: input.role,
      },
    },
  });

  if (error) {
    return null;
  }

  return data.properties?.action_link ?? null;
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

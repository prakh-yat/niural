"use client";

import { createBrowserClient } from "@supabase/ssr";

import type { PortalSessionScope } from "@/lib/supabase/cookies";
import { getSupabaseCookieName } from "@/lib/supabase/cookies";

export function createSupabaseBrowserClient(scope?: PortalSessionScope) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    return null;
  }

  return createBrowserClient(supabaseUrl, supabaseAnonKey, {
    cookieOptions: scope
      ? {
          name: getSupabaseCookieName(scope),
        }
      : undefined,
  });
}

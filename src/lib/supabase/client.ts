"use client";

import { createBrowserClient } from "@supabase/ssr";

import { env, envFlags } from "@/lib/env";

export function createSupabaseBrowserClient() {
  if (!envFlags.hasSupabase) {
    return null;
  }

  return createBrowserClient(
    env.NEXT_PUBLIC_SUPABASE_URL!,
    env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
}

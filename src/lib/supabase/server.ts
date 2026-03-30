import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

import { env, envFlags } from "@/lib/env";
import type { PortalSessionScope } from "@/lib/supabase/cookies";
import { getSupabaseCookieName } from "@/lib/supabase/cookies";

export async function createSupabaseServerClient(scope?: PortalSessionScope) {
  if (!envFlags.hasSupabase) {
    return null;
  }

  const cookieStore = await cookies();

  return createServerClient(
    env.NEXT_PUBLIC_SUPABASE_URL!,
    env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookieOptions: scope
        ? {
            name: getSupabaseCookieName(scope),
          }
        : undefined,
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options);
            });
          } catch {
            // Server components can read cookies but not always mutate them.
          }
        },
      },
    },
  );
}

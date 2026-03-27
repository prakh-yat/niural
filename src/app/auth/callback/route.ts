import { NextResponse } from "next/server";
import { cookies } from "next/headers";

import { envFlags } from "@/lib/env";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const next = url.searchParams.get("next") ?? "/candidate";

  if (!code || !envFlags.hasSupabase) {
    return NextResponse.redirect(new URL(next, request.url));
  }

  const cookieStore = await cookies();
  const response = NextResponse.redirect(new URL(next, request.url));
  const supabase = await createSupabaseServerClient();

  if (supabase) {
    await supabase.auth.exchangeCodeForSession(code);
  }

  cookieStore.getAll().forEach((cookie) => {
    response.cookies.set(cookie.name, cookie.value, cookie);
  });

  return response;
}

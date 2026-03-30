import { NextResponse } from "next/server";

import { buildAdminUrl } from "@/lib/portal";
import { clearActivePortalRole, resolvePortalRole } from "@/lib/server/auth";
import { resolvePortalSessionScope } from "@/lib/supabase/cookies";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  const referer = request.headers.get("referer");
  const formData = await request.formData();
  const requestedRole = formData.get("role");
  const role =
    requestedRole === "admin" || requestedRole === "candidate"
      ? requestedRole
      : resolvePortalRole(referer ?? "/");

  const supabase = await createSupabaseServerClient(resolvePortalSessionScope(role));
  if (supabase) {
    await supabase.auth.signOut();
  }

  const destination =
    role === "admin" ? new URL(buildAdminUrl("/login"), request.url) : new URL("/auth/sign-in", request.url);
  const response = NextResponse.redirect(destination, { status: 303 });
  clearActivePortalRole(response, role);
  return response;
}

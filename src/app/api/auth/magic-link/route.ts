import { NextResponse } from "next/server";

import { requestMagicLink } from "@/lib/server/auth";

export async function POST(request: Request) {
  const formData = await request.formData();
  const email = String(formData.get("email") ?? "");
  const role = String(formData.get("role") ?? "candidate") as
    | "candidate"
    | "hiring_team"
    | "admin";

  const result = await requestMagicLink({ email, role });
  const redirectTo = new URL(`/auth/sign-in?role=${role}`, request.url);
  redirectTo.searchParams.set("message", result.message);
  return NextResponse.redirect(redirectTo, { status: 303 });
}

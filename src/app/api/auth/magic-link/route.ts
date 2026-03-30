import { NextResponse } from "next/server";

import { requestMagicLink } from "@/lib/server/auth";
import { FLASH_COOKIE_NAMES, setFlashMessage } from "@/lib/server/flash";

export async function POST(request: Request) {
  const formData = await request.formData();
  const email = String(formData.get("email") ?? "");
  const role = String(formData.get("role") ?? "candidate") as
    | "candidate"
    | "hiring_team"
    | "admin";
  const redirectPath = String(formData.get("next") ?? "") || undefined;

  const result = await requestMagicLink({
    email,
    role,
    redirectPath,
    baseUrl: new URL(request.url).origin,
  });
  const redirectTo = new URL(
    role === "admin" ? "/niural-admin/login" : "/auth/sign-in",
    request.url,
  );
  const response = NextResponse.redirect(redirectTo, { status: 303 });

  setFlashMessage(
    response,
    role === "admin" ? FLASH_COOKIE_NAMES.adminAuth : FLASH_COOKIE_NAMES.candidateAuth,
    {
      tone: result.ok ? "success" : "error",
      message: result.message,
    },
  );

  return response;
}

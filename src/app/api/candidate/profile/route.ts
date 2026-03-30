import { NextResponse } from "next/server";

import { getViewer } from "@/lib/server/auth";
import { FLASH_COOKIE_NAMES, setFlashMessage } from "@/lib/server/flash";
import { updateCandidateProfileSettings } from "@/lib/server/candidate-profile";

function parseNumber(value: FormDataEntryValue | null) {
  if (typeof value !== "string" || !value.trim()) {
    return undefined;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

export async function POST(request: Request) {
  const viewer = await getViewer("candidate");
  const formData = await request.formData();
  const next = formData.get("next");

  const redirectTo =
    typeof next === "string" && next
      ? new URL(next, request.url)
      : new URL("/app", request.url);

  if (!viewer) {
    return NextResponse.redirect(new URL("/auth/sign-in", request.url), { status: 303 });
  }

  try {
    await updateCandidateProfileSettings({
      email: viewer.email,
      fullName: viewer.fullName,
      headline: String(formData.get("headline") ?? ""),
      preferredLocation: String(formData.get("preferredLocation") ?? ""),
      skills: String(formData.get("skills") ?? "")
        .split(",")
        .map((value) => value.trim())
        .filter(Boolean),
      desiredSalaryMin: parseNumber(formData.get("desiredSalaryMin")),
      desiredSalaryMax: parseNumber(formData.get("desiredSalaryMax")),
      avatarFile: formData.get("avatar") instanceof File ? (formData.get("avatar") as File) : null,
    });

    const response = NextResponse.redirect(redirectTo, { status: 303 });
    setFlashMessage(response, FLASH_COOKIE_NAMES.candidateProfile, {
      tone: "success",
      message: "Profile preferences updated.",
    });
    return response;
  } catch (error) {
    const response = NextResponse.redirect(redirectTo, { status: 303 });
    setFlashMessage(response, FLASH_COOKIE_NAMES.candidateProfile, {
      tone: "error",
      message: error instanceof Error ? error.message : "Unable to update profile.",
    });
    return response;
  }
}

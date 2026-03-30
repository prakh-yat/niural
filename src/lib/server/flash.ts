import { cookies } from "next/headers";
import type { NextResponse } from "next/server";

export type FlashTone = "success" | "error";

export type FlashMessage = {
  tone: FlashTone;
  message: string;
};

export const FLASH_COOKIE_NAMES = {
  candidateAuth: "niural_candidate_auth_flash",
  adminAuth: "niural_admin_auth_flash",
  jobApplication: "niural_job_application_flash",
  candidateProfile: "niural_candidate_profile_flash",
  candidateInterview: "niural_candidate_interview_flash",
  adminCandidate: "niural_admin_candidate_flash",
  adminOffer: "niural_admin_offer_flash",
  adminJobs: "niural_admin_jobs_flash",
  adminSettings: "niural_admin_settings_flash",
} as const;

function encodeFlashMessage(flash: FlashMessage) {
  return encodeURIComponent(JSON.stringify(flash));
}

function decodeFlashMessage(value: string | undefined) {
  if (!value) {
    return null;
  }

  try {
    const parsed = JSON.parse(decodeURIComponent(value)) as Partial<FlashMessage>;
    if (
      (parsed.tone === "success" || parsed.tone === "error") &&
      typeof parsed.message === "string" &&
      parsed.message.trim()
    ) {
      return parsed as FlashMessage;
    }
  } catch {
    return null;
  }

  return null;
}

export async function readFlashMessage(cookieName: string) {
  const cookieStore = await cookies();
  return decodeFlashMessage(cookieStore.get(cookieName)?.value);
}

export function setFlashMessage(
  response: NextResponse,
  cookieName: string,
  flash: FlashMessage,
) {
  response.cookies.set(cookieName, encodeFlashMessage(flash), {
    path: "/",
    maxAge: 60,
    sameSite: "lax",
  });
}

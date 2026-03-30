import { NextResponse } from "next/server";

import { buildAdminUrl } from "@/lib/portal";
import { getViewer } from "@/lib/server/auth";
import { FLASH_COOKIE_NAMES, setFlashMessage } from "@/lib/server/flash";
import {
  reviewPendingInterviewReschedule,
  reviewPendingInterviewRescheduleFromToken,
} from "@/lib/server/scheduling";

function renderEmailActionResult(input: {
  title: string;
  message: string;
  tone: "success" | "error";
}) {
  return new Response(
    [
      "<!doctype html>",
      "<html lang=\"en\">",
      "<head><meta charset=\"utf-8\" /><meta name=\"viewport\" content=\"width=device-width,initial-scale=1\" /><title>Niural scheduling</title></head>",
      "<body style=\"margin:0;background:#f8fafc;font-family:Inter,Arial,sans-serif;color:#0f172a;\">",
      "<main style=\"max-width:640px;margin:0 auto;padding:48px 24px;\">",
      `<div style="border:1px solid ${input.tone === "success" ? "#c7f9d4" : "#fecaca"};background:${input.tone === "success" ? "#f0fdf4" : "#fef2f2"};border-radius:24px;padding:32px;">`,
      `<p style="margin:0 0 12px;font-size:12px;letter-spacing:0.24em;text-transform:uppercase;color:#64748b;">Niural scheduling</p>`,
      `<h1 style="margin:0 0 16px;font-size:30px;line-height:1.2;color:#0f172a;">${input.title}</h1>`,
      `<p style="margin:0;font-size:16px;line-height:1.7;color:#334155;">${input.message}</p>`,
      "</div>",
      "</main>",
      "</body>",
      "</html>",
    ].join(""),
    {
      headers: {
        "content-type": "text/html; charset=utf-8",
      },
    },
  );
}

export async function GET(request: Request) {
  const token = new URL(request.url).searchParams.get("token");

  try {
    if (!token) {
      throw new Error("Missing review token.");
    }

    const decision = (await reviewPendingInterviewRescheduleFromToken({
      token,
      baseUrl: new URL(request.url).origin,
    })).decision;

    return renderEmailActionResult({
      tone: "success",
      title:
        decision === "approve"
          ? "Interview rescheduled"
          : "Candidate follow-up option generated",
      message:
        decision === "approve"
          ? "The previous meeting state was replaced and the updated calendar invite has been sent to the candidate."
          : "The earlier alternate request was declined. The candidate has been sent a new AI-selected held time to review.",
    });
  } catch (error) {
    return renderEmailActionResult({
      tone: "error",
      title: "Review link could not be completed",
      message:
        error instanceof Error
          ? error.message
          : "The interview review action could not be completed.",
    });
  }
}

export async function POST(request: Request) {
  const referer = request.headers.get("referer");

  try {
    const viewer = await getViewer("admin");
    if (!viewer) {
      throw new Error("Admin access is required to review reschedule requests.");
    }

    const formData = await request.formData();
    const interviewId = String(formData.get("interviewId") ?? "");
    const decision = String(formData.get("decision") ?? "");

    if (decision !== "approve" && decision !== "decline") {
      throw new Error("Invalid reschedule review action.");
    }

    await reviewPendingInterviewReschedule({
      interviewId,
      decision,
      baseUrl: new URL(request.url).origin,
    });

    const response = NextResponse.redirect(
      referer ?? new URL(buildAdminUrl("/"), request.url),
      { status: 303 },
    );

    setFlashMessage(response, FLASH_COOKIE_NAMES.adminCandidate, {
      tone: "success",
      message:
        decision === "approve"
          ? "The interview was rescheduled directly and the updated invite has been sent."
          : "That option set was declined. The candidate is now reviewing an AI-selected replacement time.",
    });
    return response;
  } catch (error) {
    const response = NextResponse.redirect(
      referer ?? new URL(buildAdminUrl("/"), request.url),
      { status: 303 },
    );

    setFlashMessage(response, FLASH_COOKIE_NAMES.adminCandidate, {
      tone: "error",
      message:
        error instanceof Error ? error.message : "Reschedule review could not be completed.",
    });
    return response;
  }
}

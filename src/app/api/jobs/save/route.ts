import { NextResponse } from "next/server";

import { getViewer } from "@/lib/server/auth";
import { setSavedJobState } from "@/lib/server/job-board";

export async function POST(request: Request) {
  const viewer = await getViewer("candidate");
  const formData = await request.formData();
  const next = formData.get("next");
  const wantsJson = request.headers.get("accept")?.includes("application/json");
  const redirectTo =
    typeof next === "string" && next
      ? new URL(next, request.url)
      : new URL("/app", request.url);

  if (!viewer) {
    if (wantsJson) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    return NextResponse.redirect(new URL("/auth/sign-in", request.url), { status: 303 });
  }

  const jobId = String(formData.get("jobId") ?? "");
  const action = String(formData.get("action") ?? "save");

  if (!jobId) {
    if (wantsJson) {
      return NextResponse.json({ error: "Missing jobId" }, { status: 400 });
    }

    return NextResponse.redirect(redirectTo, { status: 303 });
  }

  await setSavedJobState({
    email: viewer.email,
    fullName: viewer.fullName,
    jobId,
    saved: action !== "unsave",
  });

  if (wantsJson) {
    return NextResponse.json({ ok: true, saved: action !== "unsave" });
  }

  return NextResponse.redirect(redirectTo, { status: 303 });
}

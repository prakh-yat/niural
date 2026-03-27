import { NextResponse } from "next/server";

import { submitApplication } from "@/lib/server/applications";

export async function POST(request: Request) {
  const url = new URL(request.url);

  try {
    const formData = await request.formData();
    const jobId = String(formData.get("jobId") ?? "");
    const result = await submitApplication(formData);
    return NextResponse.redirect(
      new URL(result.redirectPath, `${url.origin}/apply/${jobId}`),
      { status: 303 },
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Application submission failed.";
    const redirectTo = request.headers.get("referer") ?? `${url.origin}/careers`;
    const nextUrl = new URL(redirectTo);
    nextUrl.searchParams.set("error", message);
    return NextResponse.redirect(nextUrl, { status: 303 });
  }
}

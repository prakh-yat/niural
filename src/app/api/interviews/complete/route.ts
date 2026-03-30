import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";

import { completeInterview } from "@/lib/server/scheduling";
import { buildAdminUrl } from "@/lib/portal";

export async function POST(request: Request) {
  const formData = await request.formData();
  const interviewId = String(formData.get("interviewId") ?? "");

  if (!interviewId) {
    return NextResponse.json({ error: "interviewId is required" }, { status: 400 });
  }

  const result = await completeInterview({ interviewId });

  revalidatePath("/niural-admin");
  revalidatePath("/niural-admin/pipeline");

  if (result.applicationId) {
    revalidatePath(`/niural-admin/candidates/${result.applicationId}`);
  }

  const referer = request.headers.get("referer");
  const redirectUrl = referer ?? new URL(buildAdminUrl("/"), request.url).toString();

  return NextResponse.redirect(redirectUrl, { status: 303 });
}

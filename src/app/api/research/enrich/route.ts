import { NextResponse } from "next/server";

import { rerunResearch } from "@/lib/server/applications";

export async function POST(request: Request) {
  const formData = await request.formData();
  const candidateId = String(formData.get("candidateId") ?? "");

  await rerunResearch(candidateId);

  return NextResponse.redirect(request.headers.get("referer") ?? "/admin", { status: 303 });
}

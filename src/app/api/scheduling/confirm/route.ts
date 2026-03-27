import { NextResponse } from "next/server";

import { confirmInterviewSlot } from "@/lib/server/scheduling";

export async function POST(request: Request) {
  const formData = await request.formData();
  const interviewId = String(formData.get("interviewId") ?? "");
  const slotStart = String(formData.get("slotStart") ?? "");
  const slotEnd = String(formData.get("slotEnd") ?? "");

  await confirmInterviewSlot({ interviewId, slotStart, slotEnd });

  return NextResponse.redirect("/candidate?scheduled=1", { status: 303 });
}

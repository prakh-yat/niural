import { NextResponse } from "next/server";

import { generateInterviewOffers } from "@/lib/server/scheduling";

export async function POST(request: Request) {
  const formData = await request.formData();
  const candidateId = formData.get("candidateId");
  const interviewId = formData.get("interviewId");
  const rescheduleNotes = formData.get("rescheduleNotes");

  await generateInterviewOffers({
    applicationId: candidateId ? String(candidateId) : undefined,
    interviewId: interviewId ? String(interviewId) : undefined,
    rescheduleNotes: rescheduleNotes ? String(rescheduleNotes) : undefined,
  });

  return NextResponse.redirect(request.headers.get("referer") ?? "/admin", { status: 303 });
}

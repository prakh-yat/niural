import { NextResponse } from "next/server";

import { buildAdminUrl } from "@/lib/portal";
import { rerunScreening } from "@/lib/server/applications";

export async function POST(request: Request) {
  const formData = await request.formData();
  const candidateId = String(formData.get("candidateId") ?? "");

  await rerunScreening(candidateId);

  return NextResponse.redirect(
    request.headers.get("referer") ?? new URL(buildAdminUrl("/"), request.url).toString(),
    { status: 303 },
  );
}

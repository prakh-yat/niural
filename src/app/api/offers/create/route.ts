import { NextResponse } from "next/server";
import { createOfferDraft } from "@/lib/server/applications";
import { buildAdminUrl } from "@/lib/portal";

export async function POST(request: Request) {
  const formData = await request.formData();
  const applicationId = String(formData.get("applicationId") ?? "");

  if (!applicationId) {
    return NextResponse.json({ error: "applicationId is required" }, { status: 400 });
  }

  const result = await createOfferDraft({ applicationId });

  return NextResponse.redirect(
    new URL(buildAdminUrl(`/offers/${result.offerId}`), request.url),
    { status: 303 },
  );
}

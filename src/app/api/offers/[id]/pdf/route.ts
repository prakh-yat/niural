import { NextResponse } from "next/server";

import { getViewer } from "@/lib/server/auth";
import { getOfferDraftById } from "@/lib/server/data";
import { buildOfferPdfBuffer, buildOfferPdfFileName } from "@/lib/server/offer-pdf";

export async function GET(
  _request: Request,
  context: RouteContext<"/api/offers/[id]/pdf">,
) {
  const { id } = await context.params;
  const offer = await getOfferDraftById(id);

  if (!offer || offer.status === "draft") {
    return NextResponse.json({ error: "Offer not found." }, { status: 404 });
  }

  const [candidateViewer, adminViewer] = await Promise.all([
    getViewer("candidate"),
    getViewer("admin"),
  ]);
  const candidateEmail = candidateViewer?.email.toLowerCase();
  const offerEmail = offer.application.email.toLowerCase();

  if (!adminViewer && candidateEmail !== offerEmail) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const pdfBuffer = await buildOfferPdfBuffer({
    candidateName: offer.application.fullName,
    jobTitle: offer.jobTitle,
    startDate: offer.startDate,
    baseSalary: offer.baseSalary,
    bonus: offer.bonus,
    equity: offer.equity,
    managerName: offer.managerName,
    markdown: offer.markdown,
  });
  const fileName = buildOfferPdfFileName(offer.application.fullName, offer.jobTitle);

  return new NextResponse(new Uint8Array(pdfBuffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${fileName}"`,
      "Cache-Control": "private, no-store",
    },
  });
}

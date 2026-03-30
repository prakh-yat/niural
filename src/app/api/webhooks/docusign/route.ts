import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";

import { envFlags } from "@/lib/env";
import { buildAdminUrl, buildAppUrl } from "@/lib/portal";
import { processCompletedOfferSignatureByEnvelopeId } from "@/lib/server/offer-signatures";
import { recordIntegrationEvent } from "@/lib/server/workflows";

async function handleWebhook(request: Request) {
  const payload = await request.json().catch(() => ({}));
  const envelopeId = String(payload.data?.envelopeId ?? payload.envelopeId ?? "");
  const status = String(payload.data?.status ?? payload.status ?? "completed");

  if (envFlags.hasDatabase && envelopeId) {
    if (status.toLowerCase().includes("complete")) {
      const processed = await processCompletedOfferSignatureByEnvelopeId(envelopeId, "webhook");
      if (processed) {
        revalidatePath("/niural-admin");
        revalidatePath("/niural-admin/offers");
        revalidatePath("/niural-admin/pipeline");
        revalidatePath(buildAdminUrl(`/candidates/${processed.applicationId}`));
        revalidatePath(buildAdminUrl(`/offers/${processed.offerId}`));
        revalidatePath("/app/offers");
        revalidatePath(buildAppUrl(`/offers/${processed.offerId}`));
      }
    }
  }

  await recordIntegrationEvent("docusign", "envelope.webhook", "success", payload, envelopeId || undefined);
  return NextResponse.json({ ok: true });
}

export async function POST(request: Request) {
  return handleWebhook(request);
}

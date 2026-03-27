import { NextResponse } from "next/server";

import { buildOfferHtml } from "@/lib/server/offer-template";
import { createEnvelope } from "@/lib/integrations/docusign";
import { envFlags } from "@/lib/env";
import { prisma } from "@/lib/prisma";
import { inviteToSlack } from "@/lib/integrations/slack";
import { recordIntegrationEvent } from "@/lib/server/workflows";

async function handleSendEnvelope(request: Request, formData: FormData) {
  const offerId = String(formData.get("offerId") ?? "");
  const candidateName = String(formData.get("candidateName") ?? "");
  const candidateEmail = String(formData.get("candidateEmail") ?? "");
  const jobTitle = String(formData.get("jobTitle") ?? "AI Product Operator");
  const startDate = String(formData.get("startDate") ?? new Date().toISOString().slice(0, 10));
  const baseSalary = Number(formData.get("baseSalary") ?? 180000);
  const bonus = String(formData.get("bonus") ?? "10% annual bonus");
  const equity = String(formData.get("equity") ?? "0.05% stock options");
  const managerName = String(formData.get("managerName") ?? "Leo Bennett");
  const customTerms = String(formData.get("customTerms") ?? "Standard Niural employment terms apply.");

  const html = buildOfferHtml({
    candidateName,
    jobTitle,
    startDate,
    baseSalary,
    bonus,
    equity,
    managerName,
    managerGreeting: "We are excited to have you build with us.",
    customTerms,
  });

  const envelope = await createEnvelope({
    candidateName,
    candidateEmail,
    subject: `Niural offer letter · ${jobTitle}`,
    documentName: `Niural-${candidateName.replace(/\s+/g, "-")}-Offer.html`,
    documentBase64: Buffer.from(`${html}<p>/sn1/</p>`).toString("base64"),
    fileExtension: "html",
  });

  if (envFlags.hasDatabase && offerId) {
    await prisma.offerDraft.update({
      where: { id: offerId },
      data: {
        status: "sent",
        docusignEnvelopeId: envelope.envelopeId,
        sentAt: new Date(),
        markdown: html,
        html,
      },
    });
  }

  await recordIntegrationEvent("docusign", "envelope.sent", "success", {
    offerId,
    candidateEmail,
    envelopeId: envelope.envelopeId,
  });

  return NextResponse.redirect(new URL(`/candidate/offers/${offerId}`, request.url), { status: 303 });
}

async function handleWebhook(request: Request) {
  const payload = await request.json().catch(() => ({}));
  const envelopeId = String(payload.data?.envelopeId ?? payload.envelopeId ?? "");
  const status = String(payload.data?.status ?? payload.status ?? "completed");

  if (envFlags.hasDatabase && envelopeId) {
    const offer = await prisma.offerDraft.findFirst({
      where: { docusignEnvelopeId: envelopeId },
      include: { application: true },
    });

    if (offer && status.toLowerCase().includes("complete")) {
      await prisma.$transaction([
        prisma.offerDraft.update({
          where: { id: offer.id },
          data: {
            status: "signed",
            signedAt: new Date(),
          },
        }),
        prisma.application.update({
          where: { id: offer.applicationId },
          data: {
            stage: "offer_signed",
            stageReason: "DocuSign completed.",
          },
        }),
      ]);

      await inviteToSlack(offer.application.email);
    }
  }

  await recordIntegrationEvent("docusign", "envelope.webhook", "success", payload, envelopeId || undefined);
  return NextResponse.json({ ok: true });
}

export async function POST(request: Request) {
  const contentType = request.headers.get("content-type") ?? "";

  if (
    contentType.includes("multipart/form-data") ||
    contentType.includes("application/x-www-form-urlencoded")
  ) {
    const formData = await request.formData();
    return handleSendEnvelope(request, formData);
  }

  return handleWebhook(request);
}

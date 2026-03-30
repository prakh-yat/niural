import "server-only";

import { Prisma } from "@prisma/client";

import { getEnvelopeStatus } from "@/lib/integrations/docusign";
import { composeSlackWelcome } from "@/lib/integrations/openrouter";
import { inviteToSlack } from "@/lib/integrations/slack";
import { env } from "@/lib/env";
import { buildAdminUrl, buildAppUrl } from "@/lib/portal";
import { prisma } from "@/lib/prisma";
import { sendTrackedEmail } from "@/lib/server/email";
import { updateApplicationStage } from "@/lib/server/pipeline";
import {
  findIntegrationEventByDedupeKey,
  recordIntegrationEvent,
} from "@/lib/server/workflows";

const offerSignatureInclude = Prisma.validator<Prisma.OfferDraftInclude>()({
  application: {
    include: {
      candidate: true,
      jobOpening: true,
    },
  },
});

type OfferWithRelations = Prisma.OfferDraftGetPayload<{
  include: typeof offerSignatureInclude;
}>;

type OfferSignatureSyncResult = {
  checked: boolean;
  completed: boolean;
  offerId: string;
  source?: "cached" | "api";
  errorMessage?: string;
  status?: string;
};

const offerSignatureSyncCache = new Map<
  string,
  {
    checkedAt: number;
    result?: OfferSignatureSyncResult;
    promise?: Promise<OfferSignatureSyncResult>;
  }
>();

const OFFER_SYNC_TTL_MS = {
  sent: 30_000,
  signed: 5 * 60_000,
} as const;

function parseCredentialMetadata(value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }

  return value as Record<string, unknown>;
}

function buildAbsoluteUrl(path: string) {
  const baseUrl = env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  return `${baseUrl}${path}`;
}

async function getOfferById(id: string) {
  return prisma.offerDraft.findUnique({
    where: { id },
    include: offerSignatureInclude,
  });
}

async function getOfferByEnvelopeId(envelopeId: string) {
  return prisma.offerDraft.findFirst({
    where: { docusignEnvelopeId: envelopeId },
    include: offerSignatureInclude,
  });
}

async function sendInterviewerSignatureAlert(offer: OfferWithRelations, envelopeId: string) {
  const signatureAlertDedupeKey = `offer.signature_alert:${offer.id}`;
  const hasAlertEvent = await findIntegrationEventByDedupeKey(signatureAlertDedupeKey);
  if (hasAlertEvent) {
    return;
  }

  const calendarCredential = await prisma.integrationCredential.findUnique({
    where: {
      provider_lookupKey: {
        provider: "google_calendar",
        lookupKey: "primary_interviewer",
      },
    },
    select: {
      metadata: true,
    },
  });
  const metadata = parseCredentialMetadata(calendarCredential?.metadata);
  const interviewerEmail =
    (typeof metadata?.email === "string" && metadata.email) || null;

  if (!interviewerEmail) {
    return;
  }

  const adminOfferUrl = buildAbsoluteUrl(buildAdminUrl(`/offers/${offer.id}`));

  try {
    await sendTrackedEmail({
      to: interviewerEmail,
      subject: `${offer.application.fullName} signed the Niural offer`,
      html: `<p>${offer.application.fullName} has signed the offer for ${offer.jobTitle}.</p><p><a href="${adminOfferUrl}">Open the offer workspace</a></p>`,
      text: `${offer.application.fullName} has signed the offer for ${offer.jobTitle}. Review it here: ${adminOfferUrl}`,
      eventType: "offer.signature_alert",
      payload: {
        applicationId: offer.applicationId,
        offerId: offer.id,
        recipientRole: "interviewer",
        docusignEnvelopeId: envelopeId,
      },
      successDedupeKey: signatureAlertDedupeKey,
    });
  } catch (error) {
    console.warn(
      `[docusign] Signed-offer alert email failed: ${
        error instanceof Error ? error.message : String(error)
      }`,
    );
  }
}

async function sendSlackOnboardingEmail(offer: OfferWithRelations) {
  const candidateOfferUrl = buildAbsoluteUrl(buildAppUrl(`/offers/${offer.id}`));
  const slackInviteDedupeKey = `slack.invitation.requested:${offer.id}`;
  const slackEmailDedupeKey = `slack.invitation.email:${offer.id}`;
  const slackRefreshEmailDedupeKey = `slack.invitation.email.refresh:${offer.id}`;
  const hasInviteEvent = await prisma.integrationEvent.findUnique({
    where: { dedupeKey: slackInviteDedupeKey },
    select: { id: true },
  });
  const existingEmailEvent = await prisma.integrationEvent.findUnique({
    where: { dedupeKey: slackEmailDedupeKey },
    select: { id: true, payload: true },
  });
  const hasRefreshEmailEvent = await prisma.integrationEvent.findUnique({
    where: { dedupeKey: slackRefreshEmailDedupeKey },
    select: { id: true },
  });
  const existingEmailPayload =
    existingEmailEvent?.payload &&
    typeof existingEmailEvent.payload === "object" &&
    !Array.isArray(existingEmailEvent.payload)
      ? (existingEmailEvent.payload as Record<string, unknown>)
      : null;
  const previousInviteCreated = existingEmailPayload?.slackInviteCreated === true;
  const canSendRefreshEmail =
    Boolean(env.SLACK_WORKSPACE_INVITE_URL) &&
    Boolean(existingEmailEvent) &&
    !previousInviteCreated &&
    !hasRefreshEmailEvent;

  if (hasInviteEvent && existingEmailEvent && !canSendRefreshEmail) {
    return;
  }

  const welcomeMessage = await composeSlackWelcome({
    candidateName: offer.application.fullName,
    roleTitle: offer.jobTitle,
    startDate: offer.startDate.toISOString().slice(0, 10),
    managerGreeting:
      offer.application.candidate.managerGreeting ??
      "We are excited to welcome you and get you started well.",
    managerName: offer.managerName,
    team: offer.application.jobOpening.team,
    candidateHeadline: offer.application.candidate.title ?? undefined,
    candidateLocation: offer.application.candidate.location ?? undefined,
    resourceUrl: env.SLACK_ONBOARDING_RESOURCE_URL,
  });

  let slackInviteResult:
    | Awaited<ReturnType<typeof inviteToSlack>>
    | {
        mode: "preview";
        ok: false;
        inviteId: string;
        errorMessage: string;
      } = {
    mode: "preview",
    ok: false,
    inviteId: `slack-${offer.application.email}`,
    errorMessage: "Slack invitation was already processed for this offer.",
  };

  if (!hasInviteEvent) {
    slackInviteResult = await inviteToSlack(offer.application.email);
    await recordIntegrationEvent(
      "slack",
      "invite.requested",
      slackInviteResult.ok ? "success" : "failed",
      {
        offerId: offer.id,
        applicationId: offer.applicationId,
        candidateEmail: offer.application.email,
        inviteId: slackInviteResult.inviteId,
        errorMessage:
          "errorMessage" in slackInviteResult ? slackInviteResult.errorMessage : null,
        payload: "payload" in slackInviteResult ? slackInviteResult.payload : null,
      },
      slackInviteDedupeKey,
    );
  }

  if (existingEmailEvent && !canSendRefreshEmail) {
    return;
  }

  const workspaceLabel = env.SLACK_WORKSPACE_NAME;
  const inviteBody = slackInviteResult.ok
    ? `A Slack invitation to join ${workspaceLabel} has been sent to this email address. Please accept that invitation to begin onboarding.`
    : env.SLACK_WORKSPACE_INVITE_URL
      ? `Your Slack onboarding is ready. Use the workspace invite link below to join ${workspaceLabel}.`
      : `Your offer is signed and your Slack onboarding has been queued. The direct Slack invitation is not configured in this environment yet, so the team will share access details separately.`;

  try {
    const emailSubject = canSendRefreshEmail
      ? `Your ${workspaceLabel} Slack invite is ready`
      : `Welcome to ${workspaceLabel} onboarding`;

    await sendTrackedEmail({
      to: offer.application.email,
      subject: emailSubject,
      html: `<p>Hi ${offer.application.fullName},</p><p>${inviteBody}</p><p>${welcomeMessage}</p>${env.SLACK_WORKSPACE_INVITE_URL ? `<p><a href="${env.SLACK_WORKSPACE_INVITE_URL}">Join ${env.SLACK_WORKSPACE_NAME}</a></p>` : ""}<p><a href="${candidateOfferUrl}">Review your signed offer in the candidate portal</a></p>${env.SLACK_ONBOARDING_RESOURCE_URL ? `<p><a href="${env.SLACK_ONBOARDING_RESOURCE_URL}">Open onboarding resources</a></p>` : ""}`,
      text: [
        `Hi ${offer.application.fullName},`,
        "",
        inviteBody,
        "",
        welcomeMessage,
        "",
        env.SLACK_WORKSPACE_INVITE_URL
          ? `Join ${env.SLACK_WORKSPACE_NAME}: ${env.SLACK_WORKSPACE_INVITE_URL}`
          : null,
        `Review your signed offer: ${candidateOfferUrl}`,
        env.SLACK_ONBOARDING_RESOURCE_URL
          ? `Onboarding resources: ${env.SLACK_ONBOARDING_RESOURCE_URL}`
          : null,
      ]
        .filter(Boolean)
        .join("\n"),
      eventType: "slack.invitation_email",
      payload: {
        applicationId: offer.applicationId,
        offerId: offer.id,
        recipientRole: "candidate",
        slackInviteMode: slackInviteResult.mode,
        slackInviteCreated: slackInviteResult.ok,
        usedWorkspaceInviteUrl: Boolean(env.SLACK_WORKSPACE_INVITE_URL),
      },
      successDedupeKey: canSendRefreshEmail
        ? slackRefreshEmailDedupeKey
        : slackEmailDedupeKey,
    });
  } catch (error) {
    console.warn(
      `[docusign] Slack onboarding email failed: ${
        error instanceof Error ? error.message : String(error)
      }`,
    );
  }
}

async function processCompletedOfferSignatureRecord(
  offer: OfferWithRelations,
  source: "webhook" | "sync" | "read",
) {
  const transitionedToSigned = offer.status !== "signed";

  if (transitionedToSigned) {
    await prisma.offerDraft.update({
      where: { id: offer.id },
      data: {
        status: "signed",
        signedAt: new Date(),
      },
    });
  }

  if (!["offer_signed", "onboarded"].includes(offer.application.stage)) {
    await updateApplicationStage({
      applicationId: offer.applicationId,
      stage: "offer_signed",
      note: "DocuSign completed.",
      actor: "system",
      visibility: "admin",
    });
  }

  const envelopeId = offer.docusignEnvelopeId ?? "";
  await sendInterviewerSignatureAlert(offer, envelopeId);
  await sendSlackOnboardingEmail(offer);

  if (transitionedToSigned) {
    await recordIntegrationEvent("docusign", `envelope.${source}_completed`, "success", {
      offerId: offer.id,
      applicationId: offer.applicationId,
      envelopeId,
    });
  }

  return {
    offerId: offer.id,
    applicationId: offer.applicationId,
  };
}

export async function processCompletedOfferSignatureByEnvelopeId(
  envelopeId: string,
  source: "webhook" | "sync" | "read" = "webhook",
) {
  if (!envelopeId) {
    return null;
  }

  const offer = await getOfferByEnvelopeId(envelopeId);
  if (!offer) {
    return null;
  }

  return processCompletedOfferSignatureRecord(offer, source);
}

export async function processCompletedOfferSignatureByOfferId(
  offerId: string,
  source: "webhook" | "sync" | "read" = "read",
) {
  const offer = await getOfferById(offerId);
  if (!offer || !offer.docusignEnvelopeId) {
    return null;
  }

  return processCompletedOfferSignatureRecord(offer, source);
}

export async function syncOfferSignatureStateById(
  offerId: string,
): Promise<OfferSignatureSyncResult> {
  const offer = await getOfferById(offerId);
  if (!offer || !offer.docusignEnvelopeId) {
    return {
      checked: false,
      completed: false,
      offerId,
    } satisfies OfferSignatureSyncResult;
  }

  const ttl =
    offer.status === "signed" ? OFFER_SYNC_TTL_MS.signed : OFFER_SYNC_TTL_MS.sent;
  const cached = offerSignatureSyncCache.get(offerId);
  const now = Date.now();

  if (cached?.result && now - cached.checkedAt < ttl) {
    return cached.result;
  }

  if (cached?.promise) {
    return cached.promise;
  }

  const promise = (async () => {
    if (offer.status === "signed") {
      await processCompletedOfferSignatureRecord(offer, "read");
      const result: OfferSignatureSyncResult = {
        checked: true,
        completed: true,
        offerId,
        source: "cached" as const,
      };
      offerSignatureSyncCache.set(offerId, {
        checkedAt: Date.now(),
        result,
      });
      return result;
    }

    if (offer.status !== "sent") {
      const result: OfferSignatureSyncResult = {
        checked: false,
        completed: false,
        offerId,
      };
      offerSignatureSyncCache.set(offerId, {
        checkedAt: Date.now(),
        result,
      });
      return result;
    }

    const envelope = await getEnvelopeStatus(offer.docusignEnvelopeId!);
    if (envelope.mode !== "live") {
      const result: OfferSignatureSyncResult = {
        checked: true,
        completed: false,
        offerId,
        source: "api" as const,
        errorMessage: envelope.errorMessage,
      };
      offerSignatureSyncCache.set(offerId, {
        checkedAt: Date.now(),
        result,
      });
      return result;
    }

    const isCompleted = envelope.status.toLowerCase().includes("complete");
    if (isCompleted) {
      await processCompletedOfferSignatureRecord(offer, "sync");
    }

    const result: OfferSignatureSyncResult = {
      checked: true,
      completed: isCompleted,
      offerId,
      source: "api" as const,
      status: envelope.status,
    };
    offerSignatureSyncCache.set(offerId, {
      checkedAt: Date.now(),
      result,
    });
    return result;
  })().finally(() => {
    const entry = offerSignatureSyncCache.get(offerId);
    if (entry?.promise) {
      offerSignatureSyncCache.set(offerId, {
        checkedAt: entry.checkedAt,
        result: entry.result,
      });
    }
  });

  offerSignatureSyncCache.set(offerId, {
    checkedAt: now,
    result: cached?.result,
    promise,
  });

  return promise;
}

export async function syncOutstandingOfferSignatures(input?: {
  offerIds?: string[];
  limit?: number;
}) {
  const offers = input?.offerIds?.length
    ? input.offerIds
    : (
        await prisma.offerDraft.findMany({
          where: {
            docusignEnvelopeId: { not: null },
            status: { in: ["sent", "signed"] },
          },
          select: { id: true },
          orderBy: [{ updatedAt: "desc" }, { sentAt: "desc" }],
          take: input?.limit ?? 20,
        })
      ).map((offer) => offer.id);

  let checked = 0;
  let completed = 0;
  const errors: string[] = [];

  const batchSize = 4;

  for (let index = 0; index < offers.length; index += batchSize) {
    const batch = offers.slice(index, index + batchSize);
    const results = await Promise.allSettled(
      batch.map((offerId) => syncOfferSignatureStateById(offerId)),
    );

    for (const [resultIndex, settled] of results.entries()) {
      const offerId = batch[resultIndex];

      if (settled.status === "rejected") {
        errors.push(
          `${offerId}: ${
            settled.reason instanceof Error ? settled.reason.message : String(settled.reason)
          }`,
        );
        continue;
      }

      const result = settled.value;
      if (result.checked) {
        checked += 1;
      }
      if (result.completed) {
        completed += 1;
      }
      if (result.errorMessage) {
        errors.push(`${offerId}: ${result.errorMessage}`);
      }
    }
  }

  return {
    checked,
    completed,
    errors,
  };
}

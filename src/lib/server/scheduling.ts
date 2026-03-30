import crypto from "node:crypto";

import { addHours, subHours } from "date-fns";
import { Prisma } from "@prisma/client";

import {
  buildMockSlots,
  confirmInterview,
  createTentativeHold,
  findAvailability,
  getInterviewEventSnapshot,
  getCandidateRsvpStatus,
  releaseTentativeHold,
} from "@/lib/integrations/google-calendar";
import { addFirefliesToLiveMeeting } from "@/lib/integrations/fireflies";
import { proposeCandidateRescheduleOption } from "@/lib/integrations/openrouter";
import { env, envFlags } from "@/lib/env";
import { buildAppUrl } from "@/lib/portal";
import { prisma } from "@/lib/prisma";
import { withDatabaseFallback } from "@/lib/server/database";
import { sendTrackedEmail } from "@/lib/server/email";
import { recordIntegrationEvent } from "@/lib/server/workflows";

type SlotOfferResult = {
  mode: "preview" | "live";
  slots: ReturnType<typeof buildMockSlots>;
};

type ConfirmInterviewResult = {
  mode: "preview" | "live";
  googleEventId?: string;
};

type HoldExpiryResult = {
  mode: "preview" | "live";
  expiredCount: number;
};

type RsvpSyncResult = {
  mode: "preview" | "live";
  synced: number;
};

type InterviewReminderResult = {
  mode: "preview" | "live";
  nudged: number;
};

type CalendarReconciliationResult = {
  mode: "preview" | "live";
  checked: number;
  missing: number;
  repaired: number;
};

type ReviewPendingRescheduleResult = {
  mode: "preview" | "live";
  decision: "approve" | "decline";
  slots: ReturnType<typeof buildMockSlots>;
};

type CalendarConnection = {
  refreshToken: string | null;
  interviewerName?: string;
  interviewerEmail?: string;
  connectedAt?: string;
};

type RescheduleContext = {
  requestedAt: string;
  requestedBy: "admin" | "candidate";
  rescheduleNotes: string;
  approvalStatus: "pending" | "approved" | "declined";
  proposedSetId?: string;
  reviewedAt?: string;
  aiMessage?: string;
  aiIteration?: number;
  declinedSuggestionStartsAt?: string[];
};

type ReviewActionTokenPayload = {
  interviewId: string;
  offerSetId: string;
  decision: "approve" | "decline";
  exp: number;
};

const SLOT_OFFER_EXPIRY_HOURS = 72;
const SLOT_RESPONSE_NUDGE_HOURS = 24;
const MAX_OFFERED_SLOTS = 25;
const TARGET_OFFER_DAY_COUNT = 5;
const MIN_OFFER_SLOTS_PER_DAY = 3;
const MAX_OFFER_SLOTS_PER_DAY = 5;

const interviewWithOfferSetsInclude = Prisma.validator<Prisma.InterviewInclude>()({
  application: true,
  offerSets: {
    orderBy: { createdAt: "desc" },
    include: {
      slotHolds: true,
    },
  },
});

type InterviewWithOfferSets = Prisma.InterviewGetPayload<{
  include: typeof interviewWithOfferSetsInclude;
}>;

function parseCalendarConnectionMetadata(
  metadata: Prisma.JsonValue | null | undefined,
): Omit<CalendarConnection, "refreshToken"> {
  if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) {
    return {};
  }

  const record = metadata as Record<string, unknown>;
  return {
    interviewerName: typeof record.name === "string" ? record.name : undefined,
    interviewerEmail: typeof record.email === "string" ? record.email : undefined,
    connectedAt: typeof record.connectedAt === "string" ? record.connectedAt : undefined,
  };
}

function resolveInterviewerName(input: {
  explicitName?: string;
  existingName?: string;
  connectedName?: string;
  explicitEmail?: string;
  existingEmail?: string;
  connectedEmail?: string;
}) {
  const explicitName = input.explicitName?.trim();
  const existingName = input.existingName?.trim();
  const connectedName = input.connectedName?.trim();
  const fallbackEmail =
    input.explicitEmail?.trim() ||
    input.connectedEmail?.trim() ||
    input.existingEmail?.trim();

  if (explicitName) return explicitName;
  if (connectedName) return connectedName;
  if (existingName) return existingName;
  if (fallbackEmail) return fallbackEmail.split("@")[0];
  return "Connected interviewer";
}

function resolveCurrentInterviewer(input: {
  connection: CalendarConnection;
  existingName?: string;
  existingEmail?: string;
}) {
  const interviewerEmail = input.connection.interviewerEmail || input.existingEmail;
  const interviewerName = resolveInterviewerName({
    connectedName: input.connection.interviewerName,
    connectedEmail: input.connection.interviewerEmail,
    existingName: input.existingName,
    existingEmail: input.existingEmail,
  });

  return {
    interviewerEmail,
    interviewerName,
  };
}

async function getCalendarConnection() {
  return withDatabaseFallback(async () => {
    const credential = await prisma.integrationCredential.findUnique({
      where: {
        provider_lookupKey: {
          provider: "google_calendar",
          lookupKey: "primary_interviewer",
        },
      },
    });

    if (!credential) {
      return {
        refreshToken: null,
      } satisfies CalendarConnection;
    }

    return {
      refreshToken: credential.refreshToken ?? null,
      ...parseCalendarConnectionMetadata(credential.metadata),
    } satisfies CalendarConnection;
  }, () => null);
}

function parseRescheduleContext(
  metadata: Prisma.JsonValue | null | undefined,
): RescheduleContext | null {
  if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) {
    return null;
  }

  const record = metadata as Record<string, unknown>;
  return {
    requestedAt:
      typeof record.requestedAt === "string" ? record.requestedAt : new Date().toISOString(),
    requestedBy: record.requestedBy === "admin" ? "admin" : "candidate",
    rescheduleNotes:
      typeof record.rescheduleNotes === "string" ? record.rescheduleNotes : "",
    approvalStatus:
      record.approvalStatus === "approved" || record.approvalStatus === "declined"
        ? record.approvalStatus
        : "pending",
    proposedSetId: typeof record.proposedSetId === "string" ? record.proposedSetId : undefined,
    reviewedAt: typeof record.reviewedAt === "string" ? record.reviewedAt : undefined,
    aiMessage: typeof record.aiMessage === "string" ? record.aiMessage : undefined,
    aiIteration: typeof record.aiIteration === "number" ? record.aiIteration : undefined,
    declinedSuggestionStartsAt: Array.isArray(record.declinedSuggestionStartsAt)
      ? record.declinedSuggestionStartsAt.flatMap((value) =>
          typeof value === "string" ? [value] : [],
        )
      : [],
  };
}

function getSchedulingReviewSecret() {
  return (
    env.CRON_SECRET ??
    env.SUPABASE_SERVICE_ROLE_KEY ??
    env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??
    "niural-local-scheduling-review-secret"
  );
}

function createReviewActionToken(payload: ReviewActionTokenPayload) {
  const body = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const signature = crypto
    .createHmac("sha256", getSchedulingReviewSecret())
    .update(body)
    .digest("base64url");

  return `${body}.${signature}`;
}

function parseReviewActionToken(token: string): ReviewActionTokenPayload | null {
  const [body, signature] = token.split(".");
  if (!body || !signature) {
    return null;
  }

  const expected = crypto
    .createHmac("sha256", getSchedulingReviewSecret())
    .update(body)
    .digest("base64url");

  if (signature.length !== expected.length) {
    return null;
  }

  if (!crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected))) {
    return null;
  }

  try {
    const payload = JSON.parse(Buffer.from(body, "base64url").toString("utf8")) as ReviewActionTokenPayload;
    if (
      !payload ||
      typeof payload.interviewId !== "string" ||
      typeof payload.offerSetId !== "string" ||
      (payload.decision !== "approve" && payload.decision !== "decline") ||
      typeof payload.exp !== "number"
    ) {
      return null;
    }

    if (Date.now() > payload.exp) {
      return null;
    }

    return payload;
  } catch {
    return null;
  }
}

function buildCandidateInterviewLink(baseOrigin: string, interviewId: string) {
  return `${baseOrigin}${buildAppUrl(`/interviews/${interviewId}`)}`;
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function buildRescheduleReviewUrl(baseOrigin: string, token: string) {
  const url = new URL("/api/scheduling/reschedule-review", baseOrigin);
  url.searchParams.set("token", token);
  return url.toString();
}

function buildRescheduleReviewEmail(input: {
  candidateName: string;
  candidateEmail: string;
  rescheduleNotes: string;
  slotLabels: string[];
  approveUrl: string;
  declineUrl: string;
}) {
  const notes = input.rescheduleNotes.trim();
  const escapedNotes = escapeHtml(notes);
  const slotListHtml = input.slotLabels.map((slot) => `<li>${escapeHtml(slot)}</li>`).join("");
  const slotListText = input.slotLabels.map((slot) => `- ${slot}`).join("\n");
  const noteHtml = notes
    ? `<p style="margin:0 0 20px;font-size:14px;line-height:1.7;color:#4b5563;"><strong>Candidate note:</strong> ${escapedNotes}</p>`
    : `<p style="margin:0 0 20px;font-size:14px;line-height:1.7;color:#6b7280;">The candidate did not include extra availability notes.</p>`;

  return {
    subject: `Review alternate interview times for ${input.candidateName}`,
    html: [
      "<div style=\"font-family:Inter,Arial,sans-serif;max-width:620px;margin:0 auto;padding:32px 24px;color:#111827;\">",
      "<p style=\"margin:0 0 12px;font-size:12px;letter-spacing:0.24em;text-transform:uppercase;color:#6b7280;\">Niural scheduling</p>",
      `<h1 style="margin:0 0 16px;font-size:28px;line-height:1.2;color:#111827;">${escapeHtml(input.candidateName)} requested a different interview time</h1>`,
      `<p style="margin:0 0 12px;font-size:15px;line-height:1.7;color:#374151;">Candidate email: ${escapeHtml(input.candidateEmail)}</p>`,
      noteHtml,
      "<p style=\"margin:0 0 10px;font-size:14px;font-weight:600;color:#111827;\">Proposed next-best options</p>",
      `<ul style="margin:0 0 24px;padding-left:18px;font-size:14px;line-height:1.8;color:#374151;">${slotListHtml}</ul>`,
      `<div style="display:flex;gap:12px;flex-wrap:wrap;margin:0 0 20px;"><a href="${input.approveUrl}" style="display:inline-block;border-radius:14px;background:#5b21b6;padding:14px 20px;font-size:14px;font-weight:600;color:#ffffff;text-decoration:none;">Accept and send new invite</a><a href="${input.declineUrl}" style="display:inline-block;border-radius:14px;border:1px solid #f59e0b;background:#fffbeb;padding:14px 20px;font-size:14px;font-weight:600;color:#92400e;text-decoration:none;">Decline and find next best option</a></div>`,
      `<p style="margin:0;font-size:13px;line-height:1.7;color:#6b7280;">If you accept, Niural confirms the best approved slot immediately, discards the previous meeting state, and sends the updated calendar invite. If you decline, Niural generates the next best batch automatically.</p>`,
      "</div>",
    ].join(""),
    text: [
      `${input.candidateName} requested a different interview time.`,
      `Candidate email: ${input.candidateEmail}`,
      notes ? `Candidate note: ${notes}` : "The candidate did not include extra availability notes.",
      "",
      "Proposed next-best options:",
      slotListText,
      "",
      `Accept and send new invite: ${input.approveUrl}`,
      `Decline and find next best option: ${input.declineUrl}`,
    ].join("\n"),
  };
}

async function sendRescheduleReviewEmail(input: {
  baseOrigin: string;
  interviewerEmail: string;
  candidateName: string;
  candidateEmail: string;
  applicationId: string;
  rescheduleNotes: string;
  interviewId: string;
  offerSetId: string;
  expiresAt: Date;
  slotLabels: string[];
}) {
  const approveToken = createReviewActionToken({
    interviewId: input.interviewId,
    offerSetId: input.offerSetId,
    decision: "approve",
    exp: input.expiresAt.getTime(),
  });
  const declineToken = createReviewActionToken({
    interviewId: input.interviewId,
    offerSetId: input.offerSetId,
    decision: "decline",
    exp: input.expiresAt.getTime(),
  });

  const email = buildRescheduleReviewEmail({
    candidateName: input.candidateName,
    candidateEmail: input.candidateEmail,
    rescheduleNotes: input.rescheduleNotes,
    slotLabels: input.slotLabels,
    approveUrl: buildRescheduleReviewUrl(input.baseOrigin, approveToken),
    declineUrl: buildRescheduleReviewUrl(input.baseOrigin, declineToken),
  });

  await sendTrackedEmail({
    to: input.interviewerEmail,
    subject: email.subject,
    html: email.html,
    text: email.text,
    eventType: "interview.reschedule_review_request",
    payload: {
      applicationId: input.applicationId,
      interviewId: input.interviewId,
      slotOfferSetId: input.offerSetId,
      candidateEmail: input.candidateEmail,
      recipientRole: "interviewer",
    },
  });
}

function getOpenOfferSets(interview: InterviewWithOfferSets | null | undefined) {
  return interview?.offerSets.filter((set) => set.status === "open") ?? [];
}

function getPendingApprovalSets(interview: InterviewWithOfferSets | null | undefined) {
  return interview?.offerSets.filter((set) => set.status === "pending_approval") ?? [];
}

type HoldAwareOfferSet = {
  slotHolds: Array<{
    status: string;
    googleHoldEventId: string | null;
    startAt: Date;
    endAt: Date;
    id: string;
    slotOfferSetId: string;
  }>;
};

type ExistingSlotHold = Prisma.SlotHoldGetPayload<{
  include: {
    slotOfferSet: true;
  };
}>;

function getHeldSlotHolds(
  offerSets: HoldAwareOfferSet[],
) {
  return offerSets.flatMap((set) => set.slotHolds.filter((hold) => hold.status === "held"));
}

function getHeldSlotStarts(offerSets: HoldAwareOfferSet[]) {
  return getHeldSlotHolds(offerSets).map((hold) => hold.startAt.toISOString());
}

async function releaseCalendarHolds(
  refreshToken: string | undefined,
  holds: Array<{ googleHoldEventId: string | null }>,
) {
  await Promise.allSettled(
    holds.map((hold) => releaseTentativeHold(refreshToken, hold.googleHoldEventId)),
  );
}

function isReusableSlotHold(existing: ExistingSlotHold) {
  return (
    existing.status === "released" ||
    existing.status === "expired" ||
    existing.slotOfferSet.status === "superseded" ||
    existing.slotOfferSet.status === "expired"
  );
}

async function findExistingSlotHold(startAt: Date) {
  return prisma.slotHold.findUnique({
    where: {
      calendarId_startAt: {
        calendarId: env.GOOGLE_CALENDAR_ID,
        startAt,
      },
    },
    include: {
      slotOfferSet: true,
    },
  });
}

async function recycleExistingSlotHold(
  refreshToken: string,
  existing: ExistingSlotHold,
) {
  await releaseTentativeHold(refreshToken, existing.googleHoldEventId);
  await prisma.slotHold.delete({
    where: {
      id: existing.id,
    },
  });
}

async function reserveSlotHold(input: {
  slotOfferSetId: string;
  refreshToken: string;
  slot: ReturnType<typeof buildMockSlots>[number];
}) {
  const startAt = new Date(input.slot.startsAt);
  const endAt = new Date(input.slot.endsAt);
  const existing = await findExistingSlotHold(startAt);

  if (existing) {
    if (!isReusableSlotHold(existing)) {
      return null;
    }

    await recycleExistingSlotHold(input.refreshToken, existing);
  }

  const hold = await createTentativeHold(input.refreshToken, input.slot);

  try {
    return await prisma.slotHold.create({
      data: {
        slotOfferSetId: input.slotOfferSetId,
        calendarId: env.GOOGLE_CALENDAR_ID,
        googleHoldEventId: hold.id,
        startAt,
        endAt,
        status: "held",
      },
    });
  } catch (error) {
    await releaseTentativeHold(input.refreshToken, hold.id);

    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      const conflicted = await findExistingSlotHold(startAt);
      if (conflicted && isReusableSlotHold(conflicted)) {
        await recycleExistingSlotHold(input.refreshToken, conflicted);
      }
      return null;
    }

    throw error;
  }
}

async function createOfferSetWithHolds(input: {
  interviewId: string;
  refreshToken: string;
  slots: ReturnType<typeof buildMockSlots>;
  status: string;
}) {
  const set = await prisma.slotOfferSet.create({
    data: {
      interviewId: input.interviewId,
      expiresAt: addHours(new Date(), SLOT_OFFER_EXPIRY_HOURS),
      status: input.status,
    },
  });

  for (const slot of input.slots) {
    await reserveSlotHold({
      slotOfferSetId: set.id,
      refreshToken: input.refreshToken,
      slot,
    });
  }

  const createdSet = await prisma.slotOfferSet.findUniqueOrThrow({
    where: { id: set.id },
    include: { slotHolds: true },
  });

  if (createdSet.slotHolds.length === 0) {
    await prisma.slotOfferSet.delete({
      where: { id: set.id },
    });
    throw new Error(
      "No reusable interview slots were available after existing holds were checked.",
    );
  }

  return createdSet;
}

async function discardOfferSet(input: {
  refreshToken: string;
  offerSetId: string;
  slotHolds: HoldAwareOfferSet["slotHolds"];
}) {
  await releaseCalendarHolds(input.refreshToken, input.slotHolds);
  await prisma.$transaction([
    prisma.slotOfferSet.update({
      where: { id: input.offerSetId },
      data: { status: "superseded" },
    }),
    prisma.slotHold.updateMany({
      where: {
        slotOfferSetId: input.offerSetId,
        status: "held",
      },
      data: { status: "released" },
    }),
  ]);
}

function formatHoldLabel(input: { startAt: Date; endAt: Date }) {
  return `${input.startAt.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  })} · ${input.startAt.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  })} - ${input.endAt.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  })}`;
}

async function createAiRescheduleSuggestion(input: {
  interview: InterviewWithOfferSets;
  refreshToken: string;
  existingContext: RescheduleContext | null;
  excludeStartsAt?: string[];
}) {
  const excludedStartsAt = Array.from(
    new Set([
      ...(input.excludeStartsAt ?? []),
      ...(input.existingContext?.declinedSuggestionStartsAt ?? []),
    ]),
  );
  const slots = await findAvailability(input.refreshToken, { excludeStartsAt: excludedStartsAt });

  if (slots.length === 0) {
    throw new Error("No next-best alternative interview slots are available right now.");
  }

  const suggestion = await proposeCandidateRescheduleOption({
    candidateName: input.interview.application.fullName,
    jobTitle: input.interview.application.roleSelectionSnapshot,
    rescheduleNotes: input.existingContext?.rescheduleNotes ?? "",
    slotOptions: slots.map((slot) => ({
      startsAt: slot.startsAt,
      label: slot.label,
    })),
  });

  const rankedSlots = [
    ...slots.filter((slot) => slot.startsAt === suggestion.startsAt),
    ...slots.filter((slot) => slot.startsAt !== suggestion.startsAt),
  ];

  for (const slot of rankedSlots) {
    try {
      const offerSet = await createOfferSetWithHolds({
        interviewId: input.interview.id,
        refreshToken: input.refreshToken,
        slots: [slot],
        status: "open",
      });

      return {
        offerSet,
        selectedSlot: slot,
        aiMessage:
          slot.startsAt === suggestion.startsAt && suggestion.message.trim().length > 0
            ? suggestion.message.trim()
            : `The interviewer could not accommodate the earlier request, but ${slot.label} is available. Does this time work for you?`,
      };
    } catch (error) {
      if (
        error instanceof Error &&
        error.message.includes("No reusable interview slots were available")
      ) {
        continue;
      }

      throw error;
    }
  }

  throw new Error("No next-best alternative interview slots are available right now.");
}

function mapHeldSlotsToProposedSlots(
  slotHolds: Array<{ startAt: Date; endAt: Date }>,
): ReturnType<typeof buildMockSlots> {
  return slotHolds
    .slice()
    .sort((left, right) => left.startAt.getTime() - right.startAt.getTime())
    .map((hold) => ({
      label: hold.startAt.toLocaleString(),
      startsAt: hold.startAt.toISOString(),
      endsAt: hold.endAt.toISOString(),
    }));
}

function selectOfferSlots(slots: ReturnType<typeof buildMockSlots>) {
  const dayGroups = slots.reduce<
    Array<{
      key: string;
      slots: ReturnType<typeof buildMockSlots>;
    }>
  >((groups, slot) => {
    const key = new Date(slot.startsAt).toISOString().slice(0, 10);
    const existing = groups.find((group) => group.key === key);

    if (existing) {
      existing.slots.push(slot);
      return groups;
    }

    groups.push({
      key,
      slots: [slot],
    });
    return groups;
  }, []);

  const preferredGroups = dayGroups.filter((group) => group.slots.length >= MIN_OFFER_SLOTS_PER_DAY);
  const selectedGroups =
    preferredGroups.length >= TARGET_OFFER_DAY_COUNT
      ? preferredGroups.slice(0, TARGET_OFFER_DAY_COUNT)
      : dayGroups.slice(0, TARGET_OFFER_DAY_COUNT);

  return selectedGroups
    .flatMap((group) => group.slots.slice(0, MAX_OFFER_SLOTS_PER_DAY))
    .slice(0, MAX_OFFERED_SLOTS);
}

async function chooseApprovedRescheduleHold(input: {
  interview: InterviewWithOfferSets;
  slotHolds: Array<{
    id: string;
    startAt: Date;
    endAt: Date;
    status: string;
  }>;
  existingContext: RescheduleContext | null;
}) {
  const availableHolds = input.slotHolds.filter((hold) => hold.status === "held");
  if (availableHolds.length === 0) {
    throw new Error("There are no held interview slots to approve.");
  }

  const suggestion = await proposeCandidateRescheduleOption({
    candidateName: input.interview.application.fullName,
    jobTitle: input.interview.application.roleSelectionSnapshot,
    rescheduleNotes: input.existingContext?.rescheduleNotes ?? "",
    slotOptions: availableHolds.map((hold) => ({
      startsAt: hold.startAt.toISOString(),
      label: formatHoldLabel({
        startAt: hold.startAt,
        endAt: hold.endAt,
      }),
    })),
  });

  return (
    availableHolds.find(
      (hold) => hold.startAt.toISOString() === new Date(suggestion.startsAt).toISOString(),
    ) ?? availableHolds[0]
  );
}

async function finalizeInterviewSelection(input: {
  interview: InterviewWithOfferSets;
  selectedHoldId: string;
  refreshToken: string;
  interviewerName: string;
  interviewerEmail?: string;
  stageReason: string;
  confirmedBy: "candidate" | "interviewer";
}) {
  const selected = input.interview.offerSets
    .flatMap((set) => set.slotHolds)
    .find((hold) => hold.id === input.selectedHoldId);

  if (!selected || selected.status !== "held") {
    throw new Error("Selected slot is no longer available.");
  }

  const allHeldHolds = input.interview.offerSets.flatMap((set) =>
    set.slotHolds.filter((hold) => hold.status === "held"),
  );
  const event = await confirmInterview(input.refreshToken, {
    slot: {
      label: formatHoldLabel({
        startAt: selected.startAt,
        endAt: selected.endAt,
      }),
      startsAt: selected.startAt.toISOString(),
      endsAt: selected.endAt.toISOString(),
    },
    interviewerName: input.interviewerName,
    candidateEmail: input.interview.application.email,
    candidateName: input.interview.application.fullName,
    existingEventId: input.interview.googleEventId,
  });

  await releaseCalendarHolds(input.refreshToken, allHeldHolds);

  await prisma.$transaction([
    prisma.slotHold.updateMany({
      where: {
        slotOfferSetId: {
          in: input.interview.offerSets.map((set) => set.id),
        },
        id: { not: selected.id },
        status: { in: ["held", "confirmed"] },
      },
      data: { status: "released" },
    }),
    prisma.slotHold.update({
      where: { id: selected.id },
      data: { status: "confirmed" },
    }),
    prisma.slotOfferSet.updateMany({
      where: { id: { in: input.interview.offerSets.map((set) => set.id) } },
      data: { status: "superseded" },
    }),
    prisma.slotOfferSet.update({
      where: { id: selected.slotOfferSetId },
      data: { status: "confirmed" },
    }),
    prisma.interview.update({
      where: { id: input.interview.id },
      data: {
        interviewerName: input.interviewerName,
        interviewerEmail: input.interviewerEmail ?? input.interview.interviewerEmail,
        status: "scheduled",
        startsAt: selected.startAt,
        endsAt: selected.endAt,
        confirmedAt: new Date(),
        googleEventId: event.id,
        meetingUrl: event.hangoutLink,
        candidateRsvp: "needsAction",
        rescheduleContext: Prisma.JsonNull,
      },
    }),
    prisma.application.update({
      where: { id: input.interview.application.id },
      data: {
        stage: "interview_scheduled",
        stageReason: input.stageReason,
      },
    }),
  ]);

  const wasRescheduled = Boolean(input.interview.googleEventId);
  const slotLabel = formatHoldLabel({
    startAt: selected.startAt,
    endAt: selected.endAt,
  });

  try {
    await sendTrackedEmail({
      to: input.interview.application.email,
      subject: wasRescheduled
        ? "Your Niural interview has been rescheduled"
        : "Your Niural interview is confirmed",
      html: `<p>${
        wasRescheduled
          ? "Your interview has been rescheduled."
          : "Your interview is confirmed."
      }</p><p><strong>${slotLabel}</strong></p><p>${
        event.hangoutLink
          ? `Meeting link: <a href="${event.hangoutLink}">${event.hangoutLink}</a>`
          : "The meeting invite has been updated in Google Calendar."
      }</p>`,
      text: `${
        wasRescheduled
          ? "Your interview has been rescheduled."
          : "Your interview is confirmed."
      } ${slotLabel}. ${
        event.hangoutLink
          ? `Meeting link: ${event.hangoutLink}`
          : "The meeting invite has been updated in Google Calendar."
      }`,
      eventType: wasRescheduled
        ? "interview.reschedule_confirmed"
        : "interview.confirmation_email",
      payload: {
        applicationId: input.interview.application.id,
        interviewId: input.interview.id,
        recipientRole: "candidate",
        confirmedBy: input.confirmedBy,
        slotStart: selected.startAt.toISOString(),
        slotEnd: selected.endAt.toISOString(),
        googleEventId: event.id,
      },
    });
  } catch (error) {
    console.warn(
      `[scheduling] Candidate confirmation email failed for ${input.interview.id}: ${
        error instanceof Error ? error.message : String(error)
      }`,
    );
  }

  await recordIntegrationEvent("google_calendar", "interview.confirmed", "success", {
    applicationId: input.interview.application.id,
    interviewId: input.interview.id,
    googleEventId: event.id,
    confirmedBy: input.confirmedBy,
  });

  if (event.hangoutLink) {
    try {
      const fireflies = await addFirefliesToLiveMeeting({
        meetingLink: event.hangoutLink,
        title: `Niural interview · ${input.interview.application.fullName}`,
        attendeeEmails: [
          input.interview.application.email,
          input.interviewerEmail ?? input.interview.interviewerEmail,
        ],
      });

      await recordIntegrationEvent("fireflies", "meeting.bot_invited", "success", {
        applicationId: input.interview.application.id,
        interviewId: input.interview.id,
        googleEventId: event.id,
        meetingLink: event.hangoutLink,
        firefliesMode: fireflies.mode,
      });
    } catch (error) {
      await recordIntegrationEvent("fireflies", "meeting.bot_invited", "failed", {
        applicationId: input.interview.application.id,
        interviewId: input.interview.id,
        message: error instanceof Error ? error.message : "Unknown Fireflies error",
      });
    }
  }

  return { event, selected, wasRescheduled };
}

function resolveSchedulingStage(input: {
  currentStage: string;
  interviewStatus: string;
}) {
  if (input.currentStage === "interview_scheduled" || input.interviewStatus === "scheduled") {
    return "interview_scheduled" as const;
  }

  return "interview_pending" as const;
}

export async function generateInterviewOffers(input: {
  applicationId?: string;
  interviewId?: string;
  rescheduleNotes?: string;
  baseUrl?: string;
  requestedBy?: "admin" | "candidate";
  notifyCandidate?: boolean;
}): Promise<SlotOfferResult> {
  return withDatabaseFallback<SlotOfferResult>(async () => {
    const application = input.applicationId
      ? await prisma.application.findUnique({ where: { id: input.applicationId } })
      : null;

    const interviewId = input.interviewId ?? (application ? `pending-${application.id}` : undefined);
    const existingInterview = interviewId
      ? await prisma.interview.findUnique({
          where: { id: interviewId },
          include: interviewWithOfferSetsInclude,
        })
      : null;

    const applicationRecord = application ?? existingInterview?.application;
    if (!applicationRecord || !interviewId) {
      throw new Error("Application not found for scheduling.");
    }

    const connection = await getCalendarConnection();
    if (!envFlags.hasGoogleCalendar || !connection?.refreshToken) {
      throw new Error("Connect the interviewer Google Calendar in admin settings before offering interview slots.");
    }

    const { interviewerEmail, interviewerName } = resolveCurrentInterviewer({
      connection,
      existingName: existingInterview?.interviewerName,
      existingEmail: existingInterview?.interviewerEmail,
    });

    if (!interviewerEmail) {
      throw new Error("The connected Google Calendar account does not expose an interviewer email.");
    }

    const interview = await prisma.interview.upsert({
      where: { id: interviewId },
      update: {
        interviewerName,
        interviewerEmail,
      },
      create: {
        id: interviewId,
        applicationId: applicationRecord.id,
        interviewerEmail,
        interviewerName,
        status: "queued",
      },
    });

    const replaceableSets = [
      ...getOpenOfferSets(existingInterview),
      ...getPendingApprovalSets(existingInterview),
    ];
    await releaseCalendarHolds(connection.refreshToken, getHeldSlotHolds(replaceableSets));

    if (replaceableSets.length > 0) {
      await prisma.$transaction([
        prisma.slotOfferSet.updateMany({
          where: {
            id: {
              in: replaceableSets.map((set) => set.id),
            },
          },
          data: {
            status: "superseded",
          },
        }),
        prisma.slotHold.updateMany({
          where: {
            slotOfferSetId: {
              in: replaceableSets.map((set) => set.id),
            },
            status: "held",
          },
          data: {
            status: "released",
          },
        }),
      ]);
    }

    const slots = await findAvailability(connection.refreshToken);
    const offeredSlots = selectOfferSlots(slots);
    if (offeredSlots.length === 0) {
      throw new Error("No open 45-minute interview slots were found across the upcoming business days.");
    }

    const createdSet = await createOfferSetWithHolds({
      interviewId: interview.id,
      refreshToken: connection.refreshToken,
      slots: offeredSlots,
      status: "open",
    });
    const reservedSlots = mapHeldSlotsToProposedSlots(createdSet.slotHolds);

    const nextInterviewStatus = interview.status === "scheduled" ? "scheduled" : "offered";
    const stage = resolveSchedulingStage({
      currentStage: applicationRecord.stage,
      interviewStatus: interview.status,
    });

    await prisma.interview.update({
      where: { id: interview.id },
      data: {
        status: nextInterviewStatus,
        offeredAt: new Date(),
        rescheduleContext: input.rescheduleNotes
          ? {
              requestedAt: new Date().toISOString(),
              requestedBy: input.requestedBy ?? "candidate",
              rescheduleNotes: input.rescheduleNotes,
              approvalStatus: "approved",
            }
          : Prisma.JsonNull,
      },
    });

    await prisma.application.update({
      where: { id: applicationRecord.id },
      data: {
        stage,
        stageReason: input.notifyCandidate
          ? "Scheduling invite sent to candidate."
          : "Interview availability refreshed for scheduling.",
      },
    });

    const baseOrigin = input.baseUrl
      ? new URL(input.baseUrl).origin
      : env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
    const candidateLink = buildCandidateInterviewLink(baseOrigin, interview.id);
    if (input.notifyCandidate) {
      await sendTrackedEmail({
        to: applicationRecord.email,
        subject: "Choose your Niural interview slot",
        html: `<p>The hiring team has opened interview scheduling for you.</p><p><a href="${candidateLink}">Review and confirm your slot</a></p>`,
        text: `The hiring team has opened interview scheduling for you. Review here: ${candidateLink}`,
        eventType: "interview.scheduling_invite",
        payload: {
          applicationId: applicationRecord.id,
          interviewId: interview.id,
          recipientRole: "candidate",
          requestedBy: input.requestedBy ?? "admin",
        },
      });
    }

    await recordIntegrationEvent("google_calendar", "slots.offered", "success", {
      applicationId: applicationRecord.id,
      interviewId: interview.id,
      slotCount: reservedSlots.length,
      notifiedCandidate: Boolean(input.notifyCandidate),
    });

    return { mode: "live" as const, slots: reservedSlots };
  }, () => ({ mode: "preview" as const, slots: buildMockSlots() }));
}

export async function requestAlternativeInterviewOptions(input: {
  interviewId: string;
  rescheduleNotes?: string;
  baseUrl?: string;
}): Promise<SlotOfferResult> {
  return withDatabaseFallback<SlotOfferResult>(async () => {
    const interview = await prisma.interview.findUnique({
      where: { id: input.interviewId },
      include: interviewWithOfferSetsInclude,
    });

    if (!interview) {
      throw new Error("Interview not found for rescheduling.");
    }

    const connection = await getCalendarConnection();
    if (!envFlags.hasGoogleCalendar || !connection?.refreshToken) {
      throw new Error(
        "Connect the interviewer Google Calendar in admin settings before requesting new interview times.",
      );
    }

    const { interviewerEmail, interviewerName } = resolveCurrentInterviewer({
      connection,
      existingName: interview.interviewerName,
      existingEmail: interview.interviewerEmail,
    });

    if (!interviewerEmail) {
      throw new Error("The connected Google Calendar account does not expose an interviewer email.");
    }

    const existingPendingSets = getPendingApprovalSets(interview);
    const openSets = getOpenOfferSets(interview);
    const excludeStartsAt = [
      ...getHeldSlotStarts(openSets),
      ...getHeldSlotStarts(existingPendingSets),
    ];
    const slots = await findAvailability(connection.refreshToken, { excludeStartsAt });
    const offeredSlots = selectOfferSlots(slots);

    if (offeredSlots.length === 0) {
      throw new Error("No alternative interview slots are available right now.");
    }

    const pendingSet = await createOfferSetWithHolds({
      interviewId: interview.id,
      refreshToken: connection.refreshToken,
      slots: offeredSlots,
      status: "pending_approval",
    });
    const reservedSlots = mapHeldSlotsToProposedSlots(pendingSet.slotHolds);

    const baseOrigin = input.baseUrl
      ? new URL(input.baseUrl).origin
      : env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
    try {
      await sendRescheduleReviewEmail({
        baseOrigin,
        interviewerEmail,
        candidateName: interview.application.fullName,
        candidateEmail: interview.application.email,
        applicationId: interview.application.id,
        rescheduleNotes: input.rescheduleNotes?.trim() ?? "",
        interviewId: interview.id,
        offerSetId: pendingSet.id,
        expiresAt: pendingSet.expiresAt,
        slotLabels: pendingSet.slotHolds.map((hold) => {
          return `${hold.startAt.toLocaleDateString("en-US", {
            weekday: "short",
            month: "short",
            day: "numeric",
          })} · ${hold.startAt.toLocaleTimeString("en-US", {
            hour: "numeric",
            minute: "2-digit",
          })} - ${hold.endAt.toLocaleTimeString("en-US", {
            hour: "numeric",
            minute: "2-digit",
          })}`;
        }),
      });
    } catch (error) {
      await discardOfferSet({
        refreshToken: connection.refreshToken,
        offerSetId: pendingSet.id,
        slotHolds: pendingSet.slotHolds,
      });
      throw error;
    }

    await releaseCalendarHolds(connection.refreshToken, getHeldSlotHolds(existingPendingSets));

    if (existingPendingSets.length > 0) {
      await prisma.$transaction([
        prisma.slotOfferSet.updateMany({
          where: { id: { in: existingPendingSets.map((set) => set.id) } },
          data: { status: "superseded" },
        }),
        prisma.slotHold.updateMany({
          where: {
            slotOfferSetId: { in: existingPendingSets.map((set) => set.id) },
            status: "held",
          },
          data: { status: "released" },
        }),
      ]);
    }

    await prisma.interview.update({
      where: { id: interview.id },
      data: {
        interviewerName,
        interviewerEmail,
        rescheduleContext: {
          requestedAt: new Date().toISOString(),
          requestedBy: "candidate",
          rescheduleNotes: input.rescheduleNotes?.trim() ?? "",
          approvalStatus: "pending",
          proposedSetId: pendingSet.id,
        },
      },
    });

    await prisma.application.update({
      where: { id: interview.application.id },
      data: {
        stage: resolveSchedulingStage({
          currentStage: interview.application.stage,
          interviewStatus: interview.status,
        }),
        stageReason: "Candidate requested alternative interview times for review.",
      },
    });

    return { mode: "live" as const, slots: reservedSlots };
  }, () => ({ mode: "preview" as const, slots: buildMockSlots() }));
}

export async function reviewPendingInterviewReschedule(input: {
  interviewId: string;
  decision: "approve" | "decline";
  baseUrl?: string;
  expectedSetId?: string;
}): Promise<ReviewPendingRescheduleResult> {
  return withDatabaseFallback<ReviewPendingRescheduleResult>(async () => {
    const interview = await prisma.interview.findUnique({
      where: { id: input.interviewId },
      include: interviewWithOfferSetsInclude,
    });

    if (!interview) {
      throw new Error("Interview not found for reschedule review.");
    }

    const connection = await getCalendarConnection();
    if (!envFlags.hasGoogleCalendar || !connection?.refreshToken) {
      throw new Error(
        "Connect the interviewer Google Calendar in admin settings before reviewing reschedule requests.",
      );
    }

    const { interviewerEmail, interviewerName } = resolveCurrentInterviewer({
      connection,
      existingName: interview.interviewerName,
      existingEmail: interview.interviewerEmail,
    });

    const pendingSet = getPendingApprovalSets(interview)[0];
    if (!pendingSet) {
      throw new Error("There is no pending alternate-time request to review.");
    }

    if (input.expectedSetId && pendingSet.id !== input.expectedSetId) {
      throw new Error("This review link is stale. A newer set of alternate interview times is already pending.");
    }

    const baseOrigin = input.baseUrl
      ? new URL(input.baseUrl).origin
      : env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
    const candidateLink = buildCandidateInterviewLink(baseOrigin, interview.id);
    const openSets = getOpenOfferSets(interview);
    const openSetIds = openSets.map((set) => set.id);
    const pendingApprovalSets = getPendingApprovalSets(interview);
    const pendingSetIds = pendingApprovalSets.map((set) => set.id);
    const existingContext = parseRescheduleContext(interview.rescheduleContext);

    if (input.decision === "approve") {
      const selectedHold = await chooseApprovedRescheduleHold({
        interview,
        slotHolds: pendingSet.slotHolds,
        existingContext,
      });

      await finalizeInterviewSelection({
        interview,
        selectedHoldId: selectedHold.id,
        refreshToken: connection.refreshToken,
        interviewerName,
        interviewerEmail,
        stageReason:
          "Interviewer approved an alternate request and the interview was rescheduled directly.",
        confirmedBy: "interviewer",
      });

      return {
        mode: "live" as const,
        decision: "approve",
        slots: mapHeldSlotsToProposedSlots([selectedHold]),
      };
    }

    const excludeStartsAt = [
      ...getHeldSlotStarts(openSets),
      ...pendingSet.slotHolds.map((hold) => hold.startAt.toISOString()),
    ];
    const aiSuggestion = await createAiRescheduleSuggestion({
      interview,
      refreshToken: connection.refreshToken,
      existingContext,
      excludeStartsAt,
    });

    await releaseCalendarHolds(
      connection.refreshToken,
      getHeldSlotHolds([...openSets, ...pendingApprovalSets]),
    );

    await prisma.$transaction([
      prisma.slotOfferSet.updateMany({
        where: { id: { in: [...openSetIds, ...pendingSetIds] } },
        data: { status: "superseded" },
      }),
      prisma.slotHold.updateMany({
        where: {
          slotOfferSetId: { in: [...openSetIds, ...pendingSetIds] },
          status: "held",
        },
        data: { status: "released" },
      }),
      prisma.interview.update({
        where: { id: interview.id },
        data: {
          interviewerName,
          interviewerEmail,
          rescheduleContext: {
            requestedAt: existingContext?.requestedAt ?? new Date().toISOString(),
            requestedBy: existingContext?.requestedBy ?? "candidate",
            rescheduleNotes: existingContext?.rescheduleNotes ?? "",
            approvalStatus: "declined",
            proposedSetId: aiSuggestion.offerSet.id,
            reviewedAt: new Date().toISOString(),
            aiMessage: aiSuggestion.aiMessage,
            aiIteration: (existingContext?.aiIteration ?? 0) + 1,
            declinedSuggestionStartsAt: [
              ...(existingContext?.declinedSuggestionStartsAt ?? []),
              ...pendingSet.slotHolds.map((hold) => hold.startAt.toISOString()),
            ],
          },
        },
      }),
      prisma.application.update({
        where: { id: interview.application.id },
        data: {
          stage: resolveSchedulingStage({
            currentStage: interview.application.stage,
            interviewStatus: interview.status,
          }),
          stageReason:
            "Interviewer declined the prior alternate request. AI proposed a new held time to the candidate.",
        },
      }),
    ]);

    await sendTrackedEmail({
      to: interview.application.email,
      subject: "A new Niural interview time is ready for review",
      html: `<p>The interviewer could not accommodate the earlier request.</p><p><strong>${formatHoldLabel({
        startAt: aiSuggestion.offerSet.slotHolds[0]!.startAt,
        endAt: aiSuggestion.offerSet.slotHolds[0]!.endAt,
      })}</strong></p><p>${aiSuggestion.aiMessage}</p><p><a href="${candidateLink}">Review this option</a></p>`,
      text: `The interviewer could not accommodate the earlier request. ${aiSuggestion.aiMessage} Review here: ${candidateLink}`,
      eventType: "interview.reschedule_ai_suggestion",
      payload: {
        applicationId: interview.application.id,
        interviewId: interview.id,
        recipientRole: "candidate",
        requestedBy: existingContext?.requestedBy ?? "candidate",
      },
    });

    return {
      mode: "live" as const,
      decision: "decline",
      slots: mapHeldSlotsToProposedSlots(aiSuggestion.offerSet.slotHolds),
    };
  }, () => ({ mode: "preview" as const, decision: input.decision, slots: buildMockSlots() }));
}

export async function reviewPendingInterviewRescheduleFromToken(input: {
  token: string;
  baseUrl?: string;
}) {
  const payload = parseReviewActionToken(input.token);
  if (!payload) {
    throw new Error("This interview review link is invalid or expired.");
  }

  return reviewPendingInterviewReschedule({
    interviewId: payload.interviewId,
    decision: payload.decision,
    expectedSetId: payload.offerSetId,
    baseUrl: input.baseUrl,
  });
}

export async function requestNextCandidateRescheduleSuggestion(input: {
  interviewId: string;
}): Promise<SlotOfferResult> {
  return withDatabaseFallback<SlotOfferResult>(async () => {
    const interview = await prisma.interview.findUnique({
      where: { id: input.interviewId },
      include: interviewWithOfferSetsInclude,
    });

    if (!interview) {
      throw new Error("Interview not found for rescheduling.");
    }

    const connection = await getCalendarConnection();
    if (!envFlags.hasGoogleCalendar || !connection?.refreshToken) {
      throw new Error(
        "Connect the interviewer Google Calendar in admin settings before generating another interview option.",
      );
    }

    const existingContext = parseRescheduleContext(interview.rescheduleContext);
    if (existingContext?.approvalStatus !== "declined") {
      throw new Error("There isn't an AI-proposed interview time awaiting your response.");
    }

    const currentSet =
      interview.offerSets.find((set) => set.id === existingContext.proposedSetId) ??
      getOpenOfferSets(interview)[0];

    if (!currentSet || currentSet.slotHolds.length === 0) {
      throw new Error("There isn't an AI-proposed interview time awaiting your response.");
    }

    const currentStartsAt = currentSet.slotHolds.map((hold) => hold.startAt.toISOString());
    const aiSuggestion = await createAiRescheduleSuggestion({
      interview,
      refreshToken: connection.refreshToken,
      existingContext: {
        ...existingContext,
        declinedSuggestionStartsAt: [
          ...(existingContext.declinedSuggestionStartsAt ?? []),
          ...currentStartsAt,
        ],
      },
      excludeStartsAt: currentStartsAt,
    });

    await discardOfferSet({
      refreshToken: connection.refreshToken,
      offerSetId: currentSet.id,
      slotHolds: currentSet.slotHolds,
    });

    await prisma.interview.update({
      where: { id: interview.id },
      data: {
        rescheduleContext: {
          requestedAt: existingContext.requestedAt,
          requestedBy: existingContext.requestedBy,
          rescheduleNotes: existingContext.rescheduleNotes,
          approvalStatus: "declined",
          proposedSetId: aiSuggestion.offerSet.id,
          reviewedAt: existingContext.reviewedAt ?? new Date().toISOString(),
          aiMessage: aiSuggestion.aiMessage,
          aiIteration: (existingContext.aiIteration ?? 1) + 1,
          declinedSuggestionStartsAt: [
            ...(existingContext.declinedSuggestionStartsAt ?? []),
            ...currentStartsAt,
          ],
        },
      },
    });

    await prisma.application.update({
      where: { id: interview.application.id },
      data: {
        stage: resolveSchedulingStage({
          currentStage: interview.application.stage,
          interviewStatus: interview.status,
        }),
        stageReason: "Candidate requested another AI-proposed interview time.",
      },
    });

    return {
      mode: "live" as const,
      slots: mapHeldSlotsToProposedSlots(aiSuggestion.offerSet.slotHolds),
    };
  }, () => ({ mode: "preview" as const, slots: buildMockSlots(1) }));
}

export async function confirmInterviewSlot(input: {
  interviewId: string;
  slotStart: string;
  slotEnd: string;
}): Promise<ConfirmInterviewResult> {
  return withDatabaseFallback<ConfirmInterviewResult>(async () => {
    const interview = await prisma.interview.findUnique({
      where: { id: input.interviewId },
      include: interviewWithOfferSetsInclude,
    });

    if (!interview) {
      throw new Error("Interview not found.");
    }

    const connection = await getCalendarConnection();
    if (!envFlags.hasGoogleCalendar || !connection?.refreshToken) {
      throw new Error("Connect the interviewer Google Calendar in admin settings before confirming interview slots.");
    }

    const activeOpenSet = getOpenOfferSets(interview)[0];
    const selected = activeOpenSet?.slotHolds.find((hold) => {
      return hold.startAt.toISOString() === new Date(input.slotStart).toISOString();
    });

    if (!selected) {
      throw new Error("Selected slot is no longer available.");
    }

    if (selected.status !== "held") {
      throw new Error("Selected slot is no longer available.");
    }

    const { event } = await finalizeInterviewSelection({
      interview,
      selectedHoldId: selected.id,
      refreshToken: connection.refreshToken,
      interviewerName: interview.interviewerName,
      interviewerEmail: interview.interviewerEmail,
      stageReason: "Candidate confirmed an interview slot.",
      confirmedBy: "candidate",
    });

    return { mode: "live" as const, googleEventId: event.id };
  }, () => ({ mode: "preview" as const }));
}

export async function expireOldHolds(): Promise<HoldExpiryResult> {
  return withDatabaseFallback<HoldExpiryResult>(async () => {
    const now = new Date();
    const expired = await prisma.slotOfferSet.findMany({
      where: {
        expiresAt: { lt: now },
        status: "open",
      },
      include: {
        slotHolds: true,
      },
    });

    for (const set of expired) {
      await prisma.$transaction([
        prisma.slotOfferSet.update({
          where: { id: set.id },
          data: { status: "expired" },
        }),
        prisma.slotHold.updateMany({
          where: { slotOfferSetId: set.id, status: "held" },
          data: { status: "expired" },
        }),
      ]);
    }

    return { mode: "live" as const, expiredCount: expired.length };
  }, () => ({ mode: "preview" as const, expiredCount: 0 }));
}

export async function sendPendingInterviewNudges(): Promise<InterviewReminderResult> {
  return withDatabaseFallback<InterviewReminderResult>(async () => {
    const threshold = subHours(new Date(), SLOT_RESPONSE_NUDGE_HOURS);
    const now = new Date();
    const openSets = await prisma.slotOfferSet.findMany({
      where: {
        status: "open",
        createdAt: { lte: threshold },
        expiresAt: { gt: now },
      },
      include: {
        interview: {
          include: {
            application: true,
          },
        },
      },
    });

    let nudged = 0;

    for (const set of openSets) {
      const dedupeKey = `interview-follow-up:${set.id}`;
      const alreadySent = await prisma.integrationEvent.findUnique({
        where: { dedupeKey },
      });

      if (alreadySent) {
        continue;
      }

      const portalBaseUrl = env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
      const candidateLink = `${portalBaseUrl}${buildAppUrl(`/interviews/${set.interviewId}`)}`;

      await sendTrackedEmail({
        to: set.interview.application.email,
        subject: "Reminder: choose your Niural interview slot",
        html: `<p>This is a quick reminder to confirm your interview time.</p><p><a href="${candidateLink}">Review available slots</a></p>`,
        text: `Reminder: confirm your interview time here ${candidateLink}`,
        eventType: "interview.offer_nudge",
        payload: {
          interviewId: set.interviewId,
          applicationId: set.interview.applicationId,
          slotOfferSetId: set.id,
        },
        successDedupeKey: dedupeKey,
      });

      nudged += 1;
    }

    const rsvpPendingInterviews = await prisma.interview.findMany({
      where: {
        status: "scheduled",
        confirmedAt: { lte: threshold },
        googleEventId: { not: null },
        OR: [
          { candidateRsvp: null },
          { candidateRsvp: "needsAction" },
        ],
      },
      include: {
        application: true,
      },
    });

    for (const interview of rsvpPendingInterviews) {
      const dedupeKey = `interview-rsvp-follow-up:${interview.googleEventId}`;
      const alreadySent = await prisma.integrationEvent.findUnique({
        where: { dedupeKey },
      });

      if (alreadySent) {
        continue;
      }

      await sendTrackedEmail({
        to: interview.application.email,
        subject: "Reminder: please accept your Niural calendar invite",
        html: `<p>Your interview is scheduled for ${interview.startsAt?.toLocaleString() ?? "the confirmed time on your calendar"}.</p><p>Please open the Google Calendar invite and click <strong>Yes</strong> so the team knows you are attending.</p><p>${interview.meetingUrl ? `Meeting link: <a href="${interview.meetingUrl}">${interview.meetingUrl}</a>` : ""}</p>`,
        text: `Your interview is scheduled for ${interview.startsAt?.toLocaleString() ?? "the confirmed time on your calendar"}. Please open the Google Calendar invite and click Yes so the team knows you are attending.${interview.meetingUrl ? ` Meeting link: ${interview.meetingUrl}` : ""}`,
        eventType: "interview.rsvp_nudge",
        payload: {
          interviewId: interview.id,
          applicationId: interview.applicationId,
          googleEventId: interview.googleEventId,
        },
        successDedupeKey: dedupeKey,
      });

      nudged += 1;
    }

    return { mode: "live" as const, nudged };
  }, () => ({ mode: "preview" as const, nudged: 0 }));
}

export async function syncRsvpStatuses(): Promise<RsvpSyncResult> {
  return withDatabaseFallback<RsvpSyncResult>(async () => {
    const connection = await getCalendarConnection();
    if (!envFlags.hasGoogleCalendar || !connection?.refreshToken) {
      return { mode: "live" as const, synced: 0 };
    }

    const interviews = await prisma.interview.findMany({
      where: {
        status: "scheduled",
        googleEventId: { not: null },
      },
      include: {
        application: {
          select: {
            email: true,
          },
        },
      },
    });

    let synced = 0;

    for (const interview of interviews) {
      let responseStatus: string | null = null;
      try {
        responseStatus = await getCandidateRsvpStatus({
          refreshToken: connection.refreshToken,
          eventId: interview.googleEventId!,
          candidateEmail: interview.application.email,
        });
      } catch (error) {
        await recordIntegrationEvent("google_calendar", "interview.rsvp_sync", "failed", {
          interviewId: interview.id,
          googleEventId: interview.googleEventId,
          message: error instanceof Error ? error.message : "Unknown RSVP sync error",
        });
        continue;
      }

      if (!responseStatus || responseStatus === interview.candidateRsvp) {
        continue;
      }

      await prisma.$transaction([
        prisma.interview.update({
          where: { id: interview.id },
          data: {
            candidateRsvp: responseStatus,
          },
        }),
        prisma.application.update({
          where: { id: interview.applicationId },
          data: {
            stageReason:
              responseStatus === "accepted"
                ? "Candidate accepted the Google Calendar invite."
                : responseStatus === "declined"
                  ? "Candidate declined the Google Calendar invite."
                  : "Candidate RSVP is still pending on the Google Calendar invite.",
          },
        }),
      ]);

      synced += 1;
    }

    return { mode: "live" as const, synced };
  }, () => ({ mode: "preview" as const, synced: 0 }));
}

export async function reconcileScheduledInterviewEvents(): Promise<CalendarReconciliationResult> {
  return withDatabaseFallback<CalendarReconciliationResult>(async () => {
    const connection = await getCalendarConnection();
    if (!envFlags.hasGoogleCalendar || !connection?.refreshToken) {
      return { mode: "live" as const, checked: 0, missing: 0, repaired: 0 };
    }

    const interviews = await prisma.interview.findMany({
      where: {
        status: "scheduled",
        googleEventId: { not: null },
      },
      include: {
        application: true,
      },
    });

    let missing = 0;
    let repaired = 0;

    for (const interview of interviews) {
      let snapshot;

      try {
        snapshot = await getInterviewEventSnapshot({
          refreshToken: connection.refreshToken,
          eventId: interview.googleEventId!,
          candidateEmail: interview.application.email,
        });
      } catch (error) {
        await recordIntegrationEvent("google_calendar", "interview.event_reconciliation", "failed", {
          applicationId: interview.applicationId,
          interviewId: interview.id,
          googleEventId: interview.googleEventId,
          message: error instanceof Error ? error.message : "Unknown reconciliation error",
        });
        continue;
      }

      if (!snapshot.exists) {
        await prisma.$transaction([
          prisma.interview.update({
            where: { id: interview.id },
            data: {
              status: "queued",
              offeredAt: null,
              startsAt: null,
              endsAt: null,
              confirmedAt: null,
              googleEventId: null,
              meetingUrl: null,
              candidateRsvp: null,
              rescheduleContext: Prisma.JsonNull,
            },
          }),
          prisma.application.update({
            where: { id: interview.applicationId },
            data: {
              stage: "interview_pending",
              stageReason:
                "The scheduled Google Calendar event no longer exists. The interview needs a fresh scheduling invite.",
            },
          }),
        ]);

        await recordIntegrationEvent("google_calendar", "interview.event_missing", "failed", {
          applicationId: interview.applicationId,
          interviewId: interview.id,
          googleEventId: interview.googleEventId,
        });

        missing += 1;
        repaired += 1;
        continue;
      }

      const interviewUpdate: Prisma.InterviewUpdateInput = {};
      const changedFields: string[] = [];

      if (snapshot.startsAt) {
        const startsAt = new Date(snapshot.startsAt);
        if (!interview.startsAt || interview.startsAt.toISOString() !== startsAt.toISOString()) {
          interviewUpdate.startsAt = startsAt;
          changedFields.push("startsAt");
        }
      }

      if (snapshot.endsAt) {
        const endsAt = new Date(snapshot.endsAt);
        if (!interview.endsAt || interview.endsAt.toISOString() !== endsAt.toISOString()) {
          interviewUpdate.endsAt = endsAt;
          changedFields.push("endsAt");
        }
      }

      if ((snapshot.hangoutLink ?? null) !== (interview.meetingUrl ?? null)) {
        interviewUpdate.meetingUrl = snapshot.hangoutLink ?? null;
        changedFields.push("meetingUrl");
      }

      if (changedFields.length === 0) {
        continue;
      }

      await prisma.interview.update({
        where: { id: interview.id },
        data: interviewUpdate,
      });

      await recordIntegrationEvent("google_calendar", "interview.event_reconciliation", "success", {
        applicationId: interview.applicationId,
        interviewId: interview.id,
        googleEventId: interview.googleEventId,
        changedFields,
      });

      repaired += 1;
    }

    return {
      mode: "live" as const,
      checked: interviews.length,
      missing,
      repaired,
    };
  }, () => ({ mode: "preview" as const, checked: 0, missing: 0, repaired: 0 }));
}

export async function completeInterview(input: {
  interviewId: string;
}): Promise<{ mode: "preview" | "live"; ok: boolean; applicationId?: string }> {
  return withDatabaseFallback<{ mode: "preview" | "live"; ok: boolean; applicationId?: string }>(async () => {
    const interview = await prisma.interview.findUnique({
      where: { id: input.interviewId },
      include: { application: true },
    });

    if (!interview) {
      throw new Error("Interview not found.");
    }

    await prisma.$transaction([
      prisma.interview.update({
        where: { id: interview.id },
        data: { status: "completed" },
      }),
      prisma.application.update({
        where: { id: interview.application.id },
        data: {
          stage: "interview_completed",
          stageReason: "Interview marked as completed.",
        },
      }),
    ]);

    await recordIntegrationEvent("google_calendar", "interview.completed", "success", {
      applicationId: interview.application.id,
      interviewId: interview.id,
    });

    return { mode: "live" as const, ok: true, applicationId: interview.application.id };
  }, () => ({ mode: "preview" as const, ok: true }));
}

import { addHours } from "date-fns";

import {
  buildMockSlots,
  confirmInterview,
  createTentativeHold,
  findAvailability,
} from "@/lib/integrations/google-calendar";
import { addFirefliesToLiveMeeting } from "@/lib/integrations/fireflies";
import { sendTransactionalEmail } from "@/lib/integrations/resend";
import { env, envFlags } from "@/lib/env";
import { prisma } from "@/lib/prisma";
import { recordIntegrationEvent } from "@/lib/server/workflows";

async function getCalendarRefreshToken() {
  if (!envFlags.hasDatabase) {
    return null;
  }

  const credential = await prisma.integrationCredential.findUnique({
    where: {
      provider_lookupKey: {
        provider: "google_calendar",
        lookupKey: "primary_interviewer",
      },
    },
  });

  return credential?.refreshToken ?? null;
}

export async function generateInterviewOffers(input: {
  applicationId?: string;
  interviewId?: string;
  rescheduleNotes?: string;
}) {
  if (!envFlags.hasDatabase) {
    return { mode: "preview" as const, slots: buildMockSlots() };
  }

  const application = input.applicationId
    ? await prisma.application.findUnique({ where: { id: input.applicationId } })
    : null;

  const interview =
    input.interviewId || application
      ? await prisma.interview.upsert({
          where: { id: input.interviewId ?? `pending-${application!.id}` },
          update: {},
          create: {
            id: input.interviewId ?? `pending-${application!.id}`,
            applicationId: application!.id,
            interviewerEmail: "leo.bennett@niural-demo.com",
            interviewerName: "Leo Bennett",
            status: "queued",
          },
        })
      : null;

  if (!interview) {
    throw new Error("Interview target not found.");
  }

  const applicationRecord =
    application ??
    (await prisma.application.findUnique({ where: { id: interview.applicationId } }));

  if (!applicationRecord) {
    throw new Error("Application not found for scheduling.");
  }

  const refreshToken = await getCalendarRefreshToken();
  const slots = await findAvailability(refreshToken ?? undefined);
  const set = await prisma.slotOfferSet.create({
    data: {
      interviewId: interview.id,
      expiresAt: addHours(new Date(), 48),
      status: "open",
    },
  });

  for (const slot of slots.slice(0, 5)) {
    const hold = await createTentativeHold(refreshToken ?? undefined, slot);
    await prisma.slotHold.create({
      data: {
        slotOfferSetId: set.id,
        calendarId: env.GOOGLE_CALENDAR_ID,
        googleHoldEventId: hold.id,
        startAt: new Date(slot.startsAt),
        endAt: new Date(slot.endsAt),
        status: "held",
      },
    });
  }

  await prisma.interview.update({
    where: { id: interview.id },
    data: {
      status: "offered",
      offeredAt: new Date(),
      rescheduleContext: input.rescheduleNotes ? { rescheduleNotes: input.rescheduleNotes } : undefined,
    },
  });

  await prisma.application.update({
    where: { id: applicationRecord.id },
    data: {
      stage: "interview_pending",
      stageReason: "Interview slots offered to candidate.",
    },
  });

  const candidateLink = `${env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"}/candidate/interviews/${interview.id}`;
  await sendTransactionalEmail({
    to: applicationRecord.email,
    subject: `Choose your Niural interview slot`,
    html: `<p>We found interview availability for you.</p><p><a href="${candidateLink}">Review and confirm your slot</a></p>`,
    text: `We found interview availability for you. Review here: ${candidateLink}`,
  });

  await recordIntegrationEvent("google_calendar", "slots.offered", "success", {
    applicationId: applicationRecord.id,
    interviewId: interview.id,
    slotCount: slots.length,
  });

  return { mode: "live" as const, slots };
}

export async function confirmInterviewSlot(input: {
  interviewId: string;
  slotStart: string;
  slotEnd: string;
}) {
  if (!envFlags.hasDatabase) {
    return { mode: "preview" as const };
  }

  const interview = await prisma.interview.findUnique({
    where: { id: input.interviewId },
    include: {
      application: true,
      offerSets: {
        include: {
          slotHolds: true,
        },
        orderBy: { createdAt: "desc" },
        take: 1,
      },
    },
  });

  if (!interview) {
    throw new Error("Interview not found.");
  }

  const selected = interview.offerSets[0]?.slotHolds.find((hold) => {
    return hold.startAt.toISOString() === new Date(input.slotStart).toISOString();
  });

  if (!selected) {
    throw new Error("Selected slot is no longer available.");
  }

  const refreshToken = await getCalendarRefreshToken();
  const event = await confirmInterview(refreshToken ?? undefined, {
    slot: {
      label: new Date(input.slotStart).toLocaleString(),
      startsAt: input.slotStart,
      endsAt: input.slotEnd,
    },
    interviewerName: interview.interviewerName,
    candidateEmail: interview.application.email,
    candidateName: interview.application.fullName,
  });

  await prisma.$transaction([
    prisma.slotHold.updateMany({
      where: { slotOfferSetId: selected.slotOfferSetId, id: { not: selected.id } },
      data: { status: "released" },
    }),
    prisma.slotHold.update({
      where: { id: selected.id },
      data: { status: "confirmed" },
    }),
    prisma.interview.update({
      where: { id: interview.id },
      data: {
        status: "scheduled",
        startsAt: new Date(input.slotStart),
        endsAt: new Date(input.slotEnd),
        confirmedAt: new Date(),
        googleEventId: event.id,
        meetingUrl: event.hangoutLink,
        candidateRsvp: "needsAction",
      },
    }),
    prisma.application.update({
      where: { id: interview.application.id },
      data: {
        stage: "interview_scheduled",
        stageReason: "Candidate confirmed an interview slot.",
      },
    }),
  ]);

  await sendTransactionalEmail({
    to: interview.application.email,
    subject: "Your Niural interview is confirmed",
    html: `<p>Your interview is confirmed for ${new Date(input.slotStart).toLocaleString()}.</p><p>Meeting link: ${event.hangoutLink ?? "Generated in Google Calendar"}</p>`,
    text: `Your interview is confirmed for ${new Date(input.slotStart).toLocaleString()}. Meeting link: ${event.hangoutLink ?? "Generated in Google Calendar"}`,
  });

  await recordIntegrationEvent("google_calendar", "interview.confirmed", "success", {
    applicationId: interview.application.id,
    interviewId: interview.id,
    googleEventId: event.id,
  });

  if (event.hangoutLink) {
    try {
      const fireflies = await addFirefliesToLiveMeeting({
        meetingLink: event.hangoutLink,
        title: `Niural interview · ${interview.application.fullName}`,
        attendeeEmails: [interview.application.email, interview.interviewerEmail],
      });

      await recordIntegrationEvent("fireflies", "meeting.bot_invited", "success", {
        applicationId: interview.application.id,
        interviewId: interview.id,
        googleEventId: event.id,
        meetingLink: event.hangoutLink,
        firefliesMode: fireflies.mode,
      });
    } catch (error) {
      await recordIntegrationEvent("fireflies", "meeting.bot_invited", "failed", {
        applicationId: interview.application.id,
        interviewId: interview.id,
        message: error instanceof Error ? error.message : "Unknown Fireflies error",
      });
    }
  }

  return { mode: "live" as const, googleEventId: event.id };
}

export async function expireOldHolds() {
  if (!envFlags.hasDatabase) {
    return { mode: "preview" as const, expiredCount: 0 };
  }

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
}

export async function syncRsvpStatuses() {
  if (!envFlags.hasDatabase) {
    return { mode: "preview" as const, synced: 0 };
  }

  const interviews = await prisma.interview.findMany({
    where: {
      status: "scheduled",
      googleEventId: { not: null },
    },
  });

  return { mode: "live" as const, synced: interviews.length };
}

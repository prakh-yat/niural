import { addBusinessDays, addMinutes, set } from "date-fns";
import { google } from "googleapis";

import { env, envFlags } from "@/lib/env";
import {
  confirmMockInterviewEvent,
  createMockTentativeHold,
  deleteMockCalendarEvent,
  getMockCalendarEvent,
  listMockCalendarEvents,
} from "@/lib/integrations/google-calendar-mock";

export type ProposedSlot = {
  label: string;
  startsAt: string;
  endsAt: string;
};

type AvailabilityOptions = {
  excludeStartsAt?: string[];
  dayCount?: number;
};

export type GoogleCalendarAccount = {
  email?: string;
  name?: string;
  picture?: string;
};

export type CalendarEventSnapshot = {
  exists: boolean;
  startsAt?: string;
  endsAt?: string;
  hangoutLink?: string;
  candidateRsvp?: string | null;
};

export function getGoogleConsentUrl() {
  if (!envFlags.hasGoogleCalendar) {
    return null;
  }

  const oauth = new google.auth.OAuth2(
    env.GOOGLE_CLIENT_ID,
    env.GOOGLE_CLIENT_SECRET,
    env.GOOGLE_REDIRECT_URI,
  );

  return oauth.generateAuthUrl({
    access_type: "offline",
    prompt: "consent",
    scope: [
      "openid",
      "email",
      "profile",
      "https://www.googleapis.com/auth/calendar",
      "https://www.googleapis.com/auth/calendar.events",
    ],
  });
}

export async function exchangeGoogleCode(code: string) {
  const oauth = new google.auth.OAuth2(
    env.GOOGLE_CLIENT_ID,
    env.GOOGLE_CLIENT_SECRET,
    env.GOOGLE_REDIRECT_URI,
  );

  const { tokens } = await oauth.getToken(code);
  return tokens;
}

export async function getGoogleCalendarAccount(input: {
  accessToken?: string | null;
  refreshToken?: string | null;
}): Promise<GoogleCalendarAccount | null> {
  if (!envFlags.hasGoogleCalendar || (!input.accessToken && !input.refreshToken)) {
    return null;
  }

  const oauth = new google.auth.OAuth2(
    env.GOOGLE_CLIENT_ID,
    env.GOOGLE_CLIENT_SECRET,
    env.GOOGLE_REDIRECT_URI,
  );
  oauth.setCredentials({
    access_token: input.accessToken ?? undefined,
    refresh_token: input.refreshToken ?? undefined,
  });

  try {
    const oauth2 = google.oauth2({ version: "v2", auth: oauth });
    const { data } = await oauth2.userinfo.get();

    return {
      email: data.email ?? undefined,
      name: data.name ?? data.email ?? undefined,
      picture: data.picture ?? undefined,
    };
  } catch (error) {
    console.warn(
      `[google-calendar] Failed to load connected account profile: ${
        error instanceof Error ? error.message : String(error)
      }`,
    );
    return null;
  }
}

function buildOAuthClient(refreshToken: string) {
  const oauth = new google.auth.OAuth2(
    env.GOOGLE_CLIENT_ID,
    env.GOOGLE_CLIENT_SECRET,
    env.GOOGLE_REDIRECT_URI,
  );
  oauth.setCredentials({ refresh_token: refreshToken });
  return oauth;
}

function getGoogleApiStatusCode(error: unknown) {
  const value = error as
    | {
        code?: number;
        status?: number;
        response?: { status?: number };
        errors?: Array<{ reason?: string }>;
      }
    | undefined;

  return value?.code ?? value?.status ?? value?.response?.status ?? null;
}

function isDeletedGoogleResourceError(error: unknown) {
  const status = getGoogleApiStatusCode(error);
  if (status === 404 || status === 410) {
    return true;
  }

  const message =
    error instanceof Error ? error.message.toLowerCase() : String(error ?? "").toLowerCase();
  return message.includes("resource has been deleted");
}

function formatSlotLabel(startsAt: Date) {
  return startsAt.toLocaleString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZoneName: "short",
  });
}

const INTERVIEW_SLOT_DURATION_MINUTES = 45;
const INTERVIEW_BUSINESS_DAY_WINDOW = 5;
const INTERVIEW_SEARCH_BUSINESS_DAY_WINDOW = 15;
const INTERVIEW_SLOT_STARTS = [
  { hours: 9, minutes: 0 },
  { hours: 10, minutes: 15 },
  { hours: 11, minutes: 30 },
  { hours: 14, minutes: 0 },
  { hours: 15, minutes: 15 },
] as const;

function buildSlotsForDay(day: Date) {
  return INTERVIEW_SLOT_STARTS.map(({ hours, minutes }) => {
    const start = set(day, {
      hours,
      minutes,
      seconds: 0,
      milliseconds: 0,
    });
    const end = addMinutes(start, INTERVIEW_SLOT_DURATION_MINUTES);

    return {
      label: formatSlotLabel(start),
      startsAt: start.toISOString(),
      endsAt: end.toISOString(),
    };
  });
}

function buildPotentialSlots(dayCount = INTERVIEW_BUSINESS_DAY_WINDOW) {
  const slots: ProposedSlot[] = [];

  for (let dayIndex = 1; dayIndex <= dayCount; dayIndex += 1) {
    slots.push(...buildSlotsForDay(addBusinessDays(new Date(), dayIndex)));
  }

  return slots;
}

export async function findAvailability(
  refreshToken?: string,
  options?: AvailabilityOptions,
): Promise<ProposedSlot[]> {
  const dayCount = options?.dayCount ?? INTERVIEW_SEARCH_BUSINESS_DAY_WINDOW;
  const excludedStartsAt = new Set(
    (options?.excludeStartsAt ?? []).map((value) => new Date(value).toISOString()),
  );

  if (envFlags.isE2E) {
    const events = await listMockCalendarEvents();
    return buildPotentialSlots(dayCount).filter((slot) => {
      if (excludedStartsAt.has(new Date(slot.startsAt).toISOString())) {
        return false;
      }

      const startsAt = new Date(slot.startsAt).getTime();
      const endsAt = new Date(slot.endsAt).getTime();
      return !events.some((event) => {
        const eventStart = new Date(event.startsAt).getTime();
        const eventEnd = new Date(event.endsAt).getTime();
        return startsAt < eventEnd && endsAt > eventStart;
      });
    });
  }

  if (!refreshToken || !envFlags.hasGoogleCalendar) {
    return buildMockSlots(dayCount * INTERVIEW_SLOT_STARTS.length, options);
  }

  const auth = buildOAuthClient(refreshToken);
  const calendar = google.calendar({ version: "v3", auth });

  const timeMin = set(addBusinessDays(new Date(), 1), {
    hours: 9,
    minutes: 0,
    seconds: 0,
    milliseconds: 0,
  }).toISOString();
  const timeMax = set(addBusinessDays(new Date(), dayCount), {
    hours: 17,
    minutes: 0,
    seconds: 0,
    milliseconds: 0,
  }).toISOString();
  const freeBusy = await calendar.freebusy.query({
    requestBody: {
      timeMin,
      timeMax,
      items: [{ id: env.GOOGLE_CALENDAR_ID }],
    },
  });

  const busy = freeBusy.data.calendars?.[env.GOOGLE_CALENDAR_ID]?.busy ?? [];
  return buildPotentialSlots(dayCount).filter((slot) => {
    if (excludedStartsAt.has(new Date(slot.startsAt).toISOString())) {
      return false;
    }

    const startsAt = new Date(slot.startsAt).getTime();
    const endsAt = new Date(slot.endsAt).getTime();
    return !busy.some((block) => {
      const blockStart = new Date(block.start ?? 0).getTime();
      const blockEnd = new Date(block.end ?? 0).getTime();
      return startsAt < blockEnd && endsAt > blockStart;
    });
  });
}

export async function createTentativeHold(refreshToken: string | undefined, slot: ProposedSlot) {
  if (envFlags.isE2E) {
    const event = await createMockTentativeHold({
      startsAt: slot.startsAt,
      endsAt: slot.endsAt,
    });
    return { id: event.id };
  }

  if (!refreshToken || !envFlags.hasGoogleCalendar) {
    return { id: `mock-hold-${slot.startsAt}` };
  }

  const auth = buildOAuthClient(refreshToken);
  const calendar = google.calendar({ version: "v3", auth });
  const result = await calendar.events.insert({
    calendarId: env.GOOGLE_CALENDAR_ID,
    requestBody: {
      summary: "Niural interview hold",
      status: "tentative",
      start: { dateTime: slot.startsAt },
      end: { dateTime: slot.endsAt },
      transparency: "opaque",
    },
  });

  return { id: result.data.id ?? `hold-${slot.startsAt}` };
}

export async function releaseTentativeHold(
  refreshToken: string | undefined,
  holdEventId?: string | null,
) {
  if (envFlags.isE2E) {
    if (holdEventId) {
      await deleteMockCalendarEvent(holdEventId);
    }
    return;
  }

  if (!holdEventId || !refreshToken || !envFlags.hasGoogleCalendar) {
    return;
  }

  const auth = buildOAuthClient(refreshToken);
  const calendar = google.calendar({ version: "v3", auth });

  try {
    await calendar.events.delete({
      calendarId: env.GOOGLE_CALENDAR_ID,
      eventId: holdEventId,
      sendUpdates: "none",
    });
  } catch (error) {
    if (isDeletedGoogleResourceError(error)) {
      return;
    }

    throw error;
  }
}

export async function cancelInterviewEvent(
  refreshToken: string | undefined,
  eventId?: string | null,
) {
  if (envFlags.isE2E) {
    if (eventId) {
      await deleteMockCalendarEvent(eventId);
    }
    return;
  }

  if (!eventId || !refreshToken || !envFlags.hasGoogleCalendar) {
    return;
  }

  const auth = buildOAuthClient(refreshToken);
  const calendar = google.calendar({ version: "v3", auth });

  try {
    await calendar.events.delete({
      calendarId: env.GOOGLE_CALENDAR_ID,
      eventId,
      sendUpdates: "all",
    });
  } catch (error) {
    if (isDeletedGoogleResourceError(error)) {
      return;
    }

    throw error;
  }
}

export async function confirmInterview(refreshToken: string | undefined, input: {
  slot: ProposedSlot;
  interviewerName: string;
  candidateEmail: string;
  candidateName: string;
  existingEventId?: string | null;
}) {
  if (envFlags.isE2E) {
    const event = await confirmMockInterviewEvent({
      startsAt: input.slot.startsAt,
      endsAt: input.slot.endsAt,
      candidateEmail: input.candidateEmail,
      candidateName: input.candidateName,
      interviewerName: input.interviewerName,
      existingEventId: input.existingEventId,
    });

    return {
      id: event.id,
      hangoutLink: event.hangoutLink,
    };
  }

  if (!refreshToken || !envFlags.hasGoogleCalendar) {
    return {
      id: input.existingEventId ?? `mock-event-${input.slot.startsAt}`,
      hangoutLink: "https://meet.google.com/mock-niural",
    };
  }

  const auth = buildOAuthClient(refreshToken);
  const calendar = google.calendar({ version: "v3", auth });

  const requestBody = {
    summary: `Niural interview · ${input.candidateName}`,
    description: `Interview with ${input.interviewerName}`,
    start: { dateTime: input.slot.startsAt },
    end: { dateTime: input.slot.endsAt },
    attendees: [{ email: input.candidateEmail }],
  };

  let result;

  if (input.existingEventId) {
    try {
      result = await calendar.events.patch({
        calendarId: env.GOOGLE_CALENDAR_ID,
        eventId: input.existingEventId,
        sendUpdates: "all",
        requestBody,
      });
    } catch (error) {
      if (!isDeletedGoogleResourceError(error)) {
        throw error;
      }
    }
  }

  if (!result) {
    result = await calendar.events.insert({
      calendarId: env.GOOGLE_CALENDAR_ID,
      conferenceDataVersion: 1,
      sendUpdates: "all",
      requestBody: {
        ...requestBody,
        conferenceData: {
          createRequest: {
            requestId: `niural-${Date.now()}`,
            conferenceSolutionKey: { type: "hangoutsMeet" },
          },
        },
      },
    });
  }

  return {
    id: result.data.id ?? input.existingEventId ?? `event-${input.slot.startsAt}`,
    hangoutLink: result.data.hangoutLink ?? undefined,
  };
}

export async function getCandidateRsvpStatus(input: {
  refreshToken?: string;
  eventId: string;
  candidateEmail: string;
}) {
  const snapshot = await getInterviewEventSnapshot(input);
  return snapshot.exists ? snapshot.candidateRsvp ?? null : null;
}

export async function getInterviewEventSnapshot(input: {
  refreshToken?: string;
  eventId: string;
  candidateEmail: string;
}): Promise<CalendarEventSnapshot> {
  if (envFlags.isE2E) {
    const event = await getMockCalendarEvent(input.eventId);
    if (!event) {
      return { exists: false };
    }

    return {
      exists: true,
      startsAt: event.startsAt,
      endsAt: event.endsAt,
      hangoutLink: event.hangoutLink,
      candidateRsvp: event.candidateRsvp ?? null,
    };
  }

  if (!input.refreshToken || !envFlags.hasGoogleCalendar) {
    return { exists: false };
  }

  const auth = buildOAuthClient(input.refreshToken);
  const calendar = google.calendar({ version: "v3", auth });

  try {
    const event = await calendar.events.get({
      calendarId: env.GOOGLE_CALENDAR_ID,
      eventId: input.eventId,
    });

    const attendee = event.data.attendees?.find(
      (entry) => entry.email?.toLowerCase() === input.candidateEmail.toLowerCase(),
    );

    return {
      exists: true,
      startsAt: event.data.start?.dateTime ?? undefined,
      endsAt: event.data.end?.dateTime ?? undefined,
      hangoutLink: event.data.hangoutLink ?? undefined,
      candidateRsvp: attendee?.responseStatus ?? null,
    };
  } catch (error) {
    if (isDeletedGoogleResourceError(error)) {
      return { exists: false };
    }

    throw error;
  }
}

export function buildMockSlots(
  count = INTERVIEW_BUSINESS_DAY_WINDOW * INTERVIEW_SLOT_STARTS.length,
  options?: AvailabilityOptions,
): ProposedSlot[] {
  const excludedStartsAt = new Set(
    (options?.excludeStartsAt ?? []).map((value) => new Date(value).toISOString()),
  );

  return buildPotentialSlots(options?.dayCount ?? INTERVIEW_SEARCH_BUSINESS_DAY_WINDOW)
    .filter((slot) => !excludedStartsAt.has(new Date(slot.startsAt).toISOString()))
    .slice(0, count);
}

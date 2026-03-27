import { addBusinessDays, addHours, set } from "date-fns";
import { google } from "googleapis";

import { env, envFlags } from "@/lib/env";

export type ProposedSlot = {
  label: string;
  startsAt: string;
  endsAt: string;
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

function buildOAuthClient(refreshToken: string) {
  const oauth = new google.auth.OAuth2(
    env.GOOGLE_CLIENT_ID,
    env.GOOGLE_CLIENT_SECRET,
    env.GOOGLE_REDIRECT_URI,
  );
  oauth.setCredentials({ refresh_token: refreshToken });
  return oauth;
}

export async function findAvailability(refreshToken?: string): Promise<ProposedSlot[]> {
  if (!refreshToken || !envFlags.hasGoogleCalendar) {
    return buildMockSlots();
  }

  const auth = buildOAuthClient(refreshToken);
  const calendar = google.calendar({ version: "v3", auth });

  const timeMin = new Date().toISOString();
  const timeMax = addBusinessDays(new Date(), 5).toISOString();
  const freeBusy = await calendar.freebusy.query({
    requestBody: {
      timeMin,
      timeMax,
      items: [{ id: env.GOOGLE_CALENDAR_ID }],
    },
  });

  const busy = freeBusy.data.calendars?.[env.GOOGLE_CALENDAR_ID]?.busy ?? [];
  const slots = buildMockSlots().filter((slot) => {
    const startsAt = new Date(slot.startsAt).getTime();
    const endsAt = new Date(slot.endsAt).getTime();
    return !busy.some((block) => {
      const blockStart = new Date(block.start ?? 0).getTime();
      const blockEnd = new Date(block.end ?? 0).getTime();
      return startsAt < blockEnd && endsAt > blockStart;
    });
  });

  return slots.slice(0, 5);
}

export async function createTentativeHold(refreshToken: string | undefined, slot: ProposedSlot) {
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

export async function confirmInterview(refreshToken: string | undefined, input: {
  slot: ProposedSlot;
  interviewerName: string;
  candidateEmail: string;
  candidateName: string;
}) {
  if (!refreshToken || !envFlags.hasGoogleCalendar) {
    return {
      id: `mock-event-${input.slot.startsAt}`,
      hangoutLink: "https://meet.google.com/mock-niural",
    };
  }

  const auth = buildOAuthClient(refreshToken);
  const calendar = google.calendar({ version: "v3", auth });
  const result = await calendar.events.insert({
    calendarId: env.GOOGLE_CALENDAR_ID,
    conferenceDataVersion: 1,
    sendUpdates: "all",
    requestBody: {
      summary: `Niural interview · ${input.candidateName}`,
      description: `Interview with ${input.interviewerName}`,
      start: { dateTime: input.slot.startsAt },
      end: { dateTime: input.slot.endsAt },
      attendees: [{ email: input.candidateEmail }],
      conferenceData: {
        createRequest: {
          requestId: `niural-${Date.now()}`,
          conferenceSolutionKey: { type: "hangoutsMeet" },
        },
      },
    },
  });

  return {
    id: result.data.id ?? `event-${input.slot.startsAt}`,
    hangoutLink: result.data.hangoutLink ?? undefined,
  };
}

export function buildMockSlots(): ProposedSlot[] {
  const seed = set(new Date(), { hours: 14, minutes: 0, seconds: 0, milliseconds: 0 });

  return [0, 1, 2, 3, 4].map((offset) => {
    const start = addHours(addBusinessDays(seed, offset + 1), offset % 2 === 0 ? 0 : 3);
    const end = addHours(start, 0.75);
    return {
      label: start.toLocaleString("en-US", {
        weekday: "short",
        month: "short",
        day: "numeric",
        hour: "numeric",
        minute: "2-digit",
        timeZoneName: "short",
      }),
      startsAt: start.toISOString(),
      endsAt: end.toISOString(),
    };
  });
}

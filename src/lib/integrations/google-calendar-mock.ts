import crypto from "node:crypto";
import os from "node:os";
import path from "node:path";
import { promises as fs } from "node:fs";

type MockCalendarStore = {
  events: MockCalendarEvent[];
};

export type MockCalendarEvent = {
  id: string;
  kind: "hold" | "confirmed";
  startsAt: string;
  endsAt: string;
  hangoutLink?: string;
  candidateEmail?: string;
  candidateName?: string;
  interviewerName?: string;
  candidateRsvp?: string | null;
};

const DEFAULT_STORE: MockCalendarStore = { events: [] };
const STORE_PATH =
  process.env.NIURAL_E2E_CALENDAR_STORE ??
  path.join(os.tmpdir(), "niural-e2e-google-calendar.json");

async function readStore(): Promise<MockCalendarStore> {
  try {
    const raw = await fs.readFile(STORE_PATH, "utf8");
    const parsed = JSON.parse(raw) as MockCalendarStore;
    return {
      events: Array.isArray(parsed.events) ? parsed.events : [],
    };
  } catch {
    return DEFAULT_STORE;
  }
}

async function writeStore(store: MockCalendarStore) {
  await fs.mkdir(path.dirname(STORE_PATH), { recursive: true });
  await fs.writeFile(STORE_PATH, JSON.stringify(store, null, 2), "utf8");
}

export async function listMockCalendarEvents() {
  return (await readStore()).events;
}

export async function resetMockCalendar() {
  await writeStore(DEFAULT_STORE);
}

export async function createMockTentativeHold(input: {
  startsAt: string;
  endsAt: string;
}) {
  const store = await readStore();
  const event: MockCalendarEvent = {
    id: `mock-hold-${crypto.randomUUID()}`,
    kind: "hold",
    startsAt: input.startsAt,
    endsAt: input.endsAt,
  };

  await writeStore({
    events: [...store.events, event],
  });

  return event;
}

export async function deleteMockCalendarEvent(eventId: string) {
  const store = await readStore();
  await writeStore({
    events: store.events.filter((event) => event.id !== eventId),
  });
}

export async function confirmMockInterviewEvent(input: {
  startsAt: string;
  endsAt: string;
  candidateEmail: string;
  candidateName: string;
  interviewerName: string;
  existingEventId?: string | null;
}) {
  const store = await readStore();
  const id = input.existingEventId ?? `mock-event-${crypto.randomUUID()}`;
  const event: MockCalendarEvent = {
    id,
    kind: "confirmed",
    startsAt: input.startsAt,
    endsAt: input.endsAt,
    candidateEmail: input.candidateEmail,
    candidateName: input.candidateName,
    interviewerName: input.interviewerName,
    candidateRsvp: "needsAction",
    hangoutLink: `https://meet.google.com/mock-${id}`,
  };

  await writeStore({
    events: [...store.events.filter((entry) => entry.id !== id), event],
  });

  return event;
}

export async function setMockCalendarEventRsvp(input: {
  eventId: string;
  responseStatus: string;
}) {
  const store = await readStore();
  const events = store.events.map((event) =>
    event.id === input.eventId
      ? {
          ...event,
          candidateRsvp: input.responseStatus,
        }
      : event,
  );

  await writeStore({ events });
}

export async function getMockCalendarEvent(eventId: string) {
  const store = await readStore();
  return store.events.find((event) => event.id === eventId) ?? null;
}

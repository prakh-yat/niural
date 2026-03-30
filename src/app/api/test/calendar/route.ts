import { NextResponse } from "next/server";

import {
  deleteMockCalendarEvent,
  listMockCalendarEvents,
  setMockCalendarEventRsvp,
} from "@/lib/integrations/google-calendar-mock";
import { envFlags } from "@/lib/env";

export async function GET() {
  if (!envFlags.isE2E) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json({
    ok: true,
    events: await listMockCalendarEvents(),
  });
}

export async function POST(request: Request) {
  if (!envFlags.isE2E) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const body = (await request.json()) as {
    action?: "rsvp" | "delete";
    eventId?: string;
    responseStatus?: string;
  };

  if (!body.eventId || !body.action) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  if (body.action === "rsvp") {
    if (!body.responseStatus) {
      return NextResponse.json({ error: "Missing response status" }, { status: 400 });
    }

    await setMockCalendarEventRsvp({
      eventId: body.eventId,
      responseStatus: body.responseStatus,
    });
  } else {
    await deleteMockCalendarEvent(body.eventId);
  }

  return NextResponse.json({
    ok: true,
    events: await listMockCalendarEvents(),
  });
}

import { NextResponse } from "next/server";

import {
  expireOldHolds,
  reconcileScheduledInterviewEvents,
  sendPendingInterviewNudges,
  syncRsvpStatuses,
} from "@/lib/server/scheduling";
import { syncOutstandingOfferSignatures } from "@/lib/server/offer-signatures";

export async function GET(request: Request) {
  const vercelCronHeader = request.headers.get("x-vercel-cron");
  const secret = new URL(request.url).searchParams.get("secret");
  if (!vercelCronHeader && process.env.CRON_SECRET && secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const expired = await expireOldHolds();
  const calendar = await reconcileScheduledInterviewEvents();
  const nudges = await sendPendingInterviewNudges();
  const rsvp = await syncRsvpStatuses();
  const docusign = await syncOutstandingOfferSignatures();
  return NextResponse.json({
    ok: true,
    expired,
    calendar,
    nudges,
    rsvp,
    docusign,
  });
}

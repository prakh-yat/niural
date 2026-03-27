import { NextResponse } from "next/server";

import { expireOldHolds, syncRsvpStatuses } from "@/lib/server/scheduling";

export async function GET(request: Request) {
  const vercelCronHeader = request.headers.get("x-vercel-cron");
  const secret = new URL(request.url).searchParams.get("secret");
  if (!vercelCronHeader && process.env.CRON_SECRET && secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const [expired, rsvp] = await Promise.all([expireOldHolds(), syncRsvpStatuses()]);
  return NextResponse.json({
    ok: true,
    expired,
    rsvp,
  });
}

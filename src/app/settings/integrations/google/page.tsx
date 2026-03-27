import Link from "next/link";

import { PageFrame } from "@/components/shell/page-frame";
import { Panel } from "@/components/ui/panel";
import { StatusPill } from "@/components/ui/status-pill";
import { envFlags } from "@/lib/env";
import { getGoogleConsentUrl } from "@/lib/integrations/google-calendar";

export default async function GoogleIntegrationPage() {
  const consentUrl = getGoogleConsentUrl();

  return (
    <PageFrame>
      <section className="grid gap-6 lg:grid-cols-[0.8fr_1.2fr]">
        <Panel className="flex flex-col gap-5">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="dense-label">Integration settings</p>
              <h1 className="mt-2 font-display text-[2.4rem] tracking-[-0.05em] text-ink">
                Google Calendar
              </h1>
            </div>
            <StatusPill
              label={envFlags.hasGoogleCalendar ? "configured" : "awaiting env"}
              tone={envFlags.hasGoogleCalendar ? "open" : "preview"}
            />
          </div>
          <p className="text-sm leading-8 text-ink-soft">
            This is the single-interviewer calendar connection for v1. The OAuth connect flow captures a refresh token so server-side scheduling can keep working after consent.
          </p>
          <div className="grid gap-3">
            {[
              "Use Google freeBusy to find slots in the next 5 business days.",
              "Create tentative holds immediately after slots are offered.",
              "Confirm a real calendar event only when the candidate chooses a slot.",
              "Poll RSVP state so accepting in Google Calendar updates the app.",
            ].map((item) => (
              <div key={item} className="rounded-2xl border border-line bg-panel px-4 py-3 text-sm text-ink-soft">
                {item}
              </div>
            ))}
          </div>
        </Panel>

        <Panel className="flex flex-col gap-5">
          <div>
            <p className="dense-label">OAuth connect</p>
            <h2 className="mt-2 font-display text-[2rem] tracking-[-0.05em] text-ink">
              Connect the interviewer calendar
            </h2>
          </div>
          <div className="rounded-[1.5rem] border border-line bg-panel p-5">
            <p className="text-sm leading-8 text-ink-soft">
              The interviewer refresh token is captured after first consent and stored for scheduling, rebooking, and RSVP sync. Until the env vars exist, this page stays in preview mode.
            </p>
            <div className="mt-5 flex flex-col gap-3 sm:flex-row">
              {consentUrl ? (
                <Link
                  href={consentUrl}
                  className="inline-flex items-center justify-center rounded-full bg-accent px-5 py-3 text-sm font-semibold text-white"
                >
                  Connect Google Calendar
                </Link>
              ) : (
                <div className="inline-flex items-center justify-center rounded-full bg-panel-strong px-5 py-3 text-sm font-semibold text-ink-soft">
                  Add Google env vars to enable connect
                </div>
              )}
              <Link
                href="/admin"
                className="inline-flex items-center justify-center rounded-full border border-line px-5 py-3 text-sm font-semibold text-ink"
              >
                Back to admin
              </Link>
            </div>
          </div>
        </Panel>
      </section>
    </PageFrame>
  );
}

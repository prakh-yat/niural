import Link from "next/link";

import { Panel } from "@/components/ui/panel";
import { StatusPill } from "@/components/ui/status-pill";
import { envFlags } from "@/lib/env";
import { getGoogleConsentUrl } from "@/lib/integrations/google-calendar";

export default async function AdminGoogleIntegrationPage() {
  const consentUrl = getGoogleConsentUrl();

  return (
    <section className="grid gap-6 lg:grid-cols-[1fr_1.2fr]">
      <Panel className="flex flex-col gap-5">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="dense-label">Integration settings</p>
            <h1 className="mt-2 text-2xl font-semibold text-gray-900">
              Google Calendar
            </h1>
          </div>
          <StatusPill
            label={envFlags.hasGoogleCalendar ? "configured" : "awaiting env"}
            tone={envFlags.hasGoogleCalendar ? "open" : "preview"}
          />
        </div>
        <p className="text-sm leading-relaxed text-gray-500">
          This is the single-interviewer calendar connection for v1. The OAuth connect flow
          captures a refresh token so server-side scheduling can keep working after consent.
        </p>
        <div className="grid gap-3">
          {[
            "Use Google freeBusy to find slots in the next 5 business days.",
            "Create tentative holds immediately after slots are offered.",
            "Confirm a real calendar event only when the candidate chooses a slot.",
            "Poll RSVP state so accepting in Google Calendar updates the app.",
          ].map((item) => (
            <div
              key={item}
              className="rounded-lg border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-500"
            >
              {item}
            </div>
          ))}
        </div>
      </Panel>

      <Panel className="flex flex-col gap-5">
        <div>
          <p className="dense-label">OAuth connect</p>
          <h2 className="mt-2 text-xl font-semibold text-gray-900">
            Connect the interviewer calendar
          </h2>
        </div>
        <div className="rounded-lg border border-gray-200 bg-white p-5">
          <p className="text-sm leading-relaxed text-gray-500">
            The interviewer refresh token is captured after first consent and stored for
            scheduling, rebooking, and RSVP sync. Until the env vars exist, this page stays in
            preview mode.
          </p>
          <div className="mt-5 flex flex-col gap-3 sm:flex-row">
            {consentUrl ? (
              <Link
                href={consentUrl}
                className="inline-flex items-center justify-center rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
              >
                Connect Google Calendar
              </Link>
            ) : (
              <div className="inline-flex items-center justify-center rounded-lg bg-gray-100 px-4 py-2 text-sm font-medium text-gray-400">
                Add Google env vars to enable connect
              </div>
            )}
            <Link
              href="/"
              className="inline-flex items-center justify-center rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              Back to admin
            </Link>
          </div>
        </div>
      </Panel>
    </section>
  );
}

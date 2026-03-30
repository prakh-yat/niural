import Link from "next/link";

import { Panel } from "@/components/ui/panel";
import { FlashBanner } from "@/components/ui/flash-banner";
import { envFlags } from "@/lib/env";
import { prisma } from "@/lib/prisma";
import { withDatabaseFallback } from "@/lib/server/database";
import { FLASH_COOKIE_NAMES, readFlashMessage } from "@/lib/server/flash";
import { formatShortDate } from "@/lib/utils";

type EmailDeliveryEvent = {
  id: string;
  eventType: string;
  status: string;
  createdAt: Date;
  to: string;
  subject: string;
  recipientRole?: string;
  deliveryMode?: string;
  errorMessage?: string;
  applicationId?: string;
  interviewId?: string;
};

function parseEmailEventPayload(payload: unknown) {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    return {};
  }

  const record = payload as Record<string, unknown>;
  return {
    to: typeof record.to === "string" ? record.to : "Unknown recipient",
    subject: typeof record.subject === "string" ? record.subject : "No subject",
    recipientRole: typeof record.recipientRole === "string" ? record.recipientRole : undefined,
    deliveryMode: typeof record.deliveryMode === "string" ? record.deliveryMode : undefined,
    errorMessage: typeof record.errorMessage === "string" ? record.errorMessage : undefined,
    applicationId: typeof record.applicationId === "string" ? record.applicationId : undefined,
    interviewId: typeof record.interviewId === "string" ? record.interviewId : undefined,
  };
}

export default async function AdminSettingsPage() {
  const flash = await readFlashMessage(FLASH_COOKIE_NAMES.adminSettings);
  const settingsData: {
    calendarCredential: Awaited<ReturnType<typeof prisma.integrationCredential.findUnique>>;
    emailEvents: Awaited<ReturnType<typeof prisma.integrationEvent.findMany>>;
  } = envFlags.hasDatabase
    ? await withDatabaseFallback(
        async () => {
          const [credential, events] = await Promise.all([
            prisma.integrationCredential.findUnique({
              where: {
                provider_lookupKey: {
                  provider: "google_calendar",
                  lookupKey: "primary_interviewer",
                },
              },
            }),
            prisma.integrationEvent.findMany({
              where: {
                provider: "resend",
              },
              orderBy: { createdAt: "desc" },
              take: 60,
            }),
          ]);

          return {
            calendarCredential: credential,
            emailEvents: events,
          };
        },
        () => ({
          calendarCredential: null,
          emailEvents: [],
        }),
      )
    : {
        calendarCredential: null,
        emailEvents: [],
      };
  const { calendarCredential, emailEvents } = settingsData;
  const calendarMetadata =
    calendarCredential?.metadata &&
    typeof calendarCredential.metadata === "object" &&
    !Array.isArray(calendarCredential.metadata)
      ? (calendarCredential.metadata as Record<string, unknown>)
      : null;
  const interviewerName =
    typeof calendarMetadata?.name === "string" ? calendarMetadata.name : null;
  const interviewerEmail =
    typeof calendarMetadata?.email === "string" ? calendarMetadata.email : null;
  const connectedAt =
    typeof calendarMetadata?.connectedAt === "string" ? calendarMetadata.connectedAt : null;
  const isConnected = Boolean(calendarCredential?.refreshToken);
  const canConnectCalendar = envFlags.hasGoogleCalendar;
  const deliveryEvents: EmailDeliveryEvent[] = emailEvents.map((event) => {
    const parsed = parseEmailEventPayload(event.payload);
    return {
      id: event.id,
      eventType: event.eventType,
      status: event.status,
      createdAt: event.createdAt,
      to: parsed.to ?? "Unknown recipient",
      subject: parsed.subject ?? "No subject",
      recipientRole: parsed.recipientRole,
      deliveryMode: parsed.deliveryMode,
      errorMessage: parsed.errorMessage,
      applicationId: parsed.applicationId,
      interviewId: parsed.interviewId,
    };
  });

  return (
    <div className="mx-auto max-w-5xl space-y-8">
      <div>
        <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">Settings</p>
        <h1 className="mt-1 text-2xl font-semibold text-gray-900">Workspace settings</h1>
        <p className="mt-1 text-sm text-gray-500">
          Review the current integration posture and internal workspace configuration.
        </p>
      </div>

      {flash ? <FlashBanner cookieName={FLASH_COOKIE_NAMES.adminSettings} flash={flash} /> : null}

      <div className="grid gap-4">
        <Panel className="rounded-xl p-6">
          <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">
            Google Calendar integration
          </p>
          <h2 className="mt-2 text-lg font-semibold text-gray-900">Interview scheduling</h2>
          <p className="mt-2 text-sm leading-6 text-gray-500">
            Connect the interviewer calendar used for slot holds and interview confirmations.
          </p>
          {isConnected ? (
            <div className="mt-5 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-4">
              <p className="text-sm font-semibold text-emerald-800">
                {interviewerName || "Connected interviewer"}
              </p>
              <p className="mt-1 text-sm text-emerald-700">
                {interviewerEmail || "Calendar connected"}
              </p>
              <p className="mt-2 text-xs text-emerald-700/80">
                Connected {connectedAt ? formatShortDate(connectedAt) : "recently"}.
              </p>
            </div>
          ) : null}
          <div className="mt-5 flex items-center justify-between gap-4">
            <span
              className={`rounded-full px-3 py-1 text-xs font-semibold ${
                isConnected
                  ? "bg-emerald-50 text-emerald-700"
                  : canConnectCalendar
                    ? "bg-amber-50 text-amber-700"
                    : "bg-red-50 text-red-700"
              }`}
            >
              {isConnected
                ? "Connected"
                : canConnectCalendar
                  ? "Ready to connect"
                  : "Missing environment variables"}
            </span>
            <Link
              href="/api/auth/google/start"
              className="rounded-lg bg-violet-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-violet-700"
            >
              {isConnected ? "Reconnect Google" : "Connect Google"}
            </Link>
          </div>
          {!canConnectCalendar ? (
            <p className="mt-3 text-xs leading-5 text-red-600">
              Set `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, and `GOOGLE_REDIRECT_URI` before connecting the interviewer calendar.
            </p>
          ) : null}
        </Panel>

        <Panel className="rounded-xl p-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">
                Email delivery log
              </p>
              <h2 className="mt-2 text-lg font-semibold text-gray-900">
                Candidate and recruiter email activity
              </h2>
              <p className="mt-2 text-sm leading-6 text-gray-500">
                Review recent Resend deliveries and failures without checking server logs.
              </p>
            </div>
            <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-semibold text-gray-600">
              {deliveryEvents.length} recent events
            </span>
          </div>

          {deliveryEvents.length === 0 ? (
            <div className="mt-5 rounded-xl border border-dashed border-gray-200 px-4 py-6 text-sm text-gray-500">
              No tracked email events have been recorded yet.
            </div>
          ) : (
            <div className="mt-5 overflow-hidden rounded-xl border border-gray-200">
              <div className="grid grid-cols-[1.2fr_1.3fr_1fr_0.8fr_0.8fr] gap-3 border-b border-gray-200 bg-gray-50 px-4 py-3 text-[11px] font-semibold uppercase tracking-[0.18em] text-gray-400">
                <span>Delivery</span>
                <span>Subject</span>
                <span>Context</span>
                <span>Status</span>
                <span>Sent</span>
              </div>
              <div className="divide-y divide-gray-200">
                {deliveryEvents.map((event) => (
                  <div
                    key={event.id}
                    className="grid grid-cols-[1.2fr_1.3fr_1fr_0.8fr_0.8fr] gap-3 px-4 py-4 text-sm text-gray-600"
                  >
                    <div className="min-w-0">
                      <p className="truncate font-medium text-gray-900">{event.to}</p>
                      <p className="mt-1 text-xs text-gray-400">
                        {event.recipientRole ?? "recipient"} · {event.eventType}
                      </p>
                    </div>
                    <div className="min-w-0">
                      <p className="truncate font-medium text-gray-900">{event.subject}</p>
                      <p className="mt-1 line-clamp-2 text-xs text-gray-500">
                        {event.errorMessage ?? "Delivery recorded successfully."}
                      </p>
                    </div>
                    <div className="min-w-0 text-xs text-gray-500">
                      {event.applicationId ? (
                        <Link
                          href={`/niural-admin/candidates/${event.applicationId}`}
                          className="font-medium text-violet-700 transition hover:text-violet-800"
                        >
                          Open candidate
                        </Link>
                      ) : (
                        <span>General</span>
                      )}
                      <p className="mt-1 truncate">
                        {event.interviewId ? `Interview ${event.interviewId}` : "No interview id"}
                      </p>
                    </div>
                    <div>
                      <span
                        className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${
                          event.status === "success"
                            ? "bg-emerald-50 text-emerald-700"
                            : "bg-red-50 text-red-700"
                        }`}
                      >
                        {event.status}
                      </span>
                      <p className="mt-2 text-xs text-gray-400">{event.deliveryMode ?? "live"}</p>
                    </div>
                    <div className="text-xs text-gray-500">{formatShortDate(event.createdAt)}</div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </Panel>
      </div>
    </div>
  );
}

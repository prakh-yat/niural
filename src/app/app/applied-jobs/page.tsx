import Link from "next/link";

import { Panel } from "@/components/ui/panel";
import { StatusPill } from "@/components/ui/status-pill";
import { STAGE_LABELS } from "@/lib/domain";
import { getViewer } from "@/lib/server/auth";
import { listCandidatesByEmail } from "@/lib/server/data";
import { formatShortDate } from "@/lib/utils";

export default async function AppliedJobsPage() {
  const viewer = await getViewer("candidate");
  const applications = viewer ? await listCandidatesByEmail(viewer.email) : [];

  return (
    <div className="mx-auto max-w-5xl px-6 py-10">
      <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">
        Applied Jobs
      </p>
      <h1 className="mt-2 text-2xl font-semibold text-gray-900">
        Your Applications
      </h1>

      {applications.length === 0 ? (
        <Panel className="mt-8">
          <p className="text-sm text-gray-500">
            You haven&apos;t applied to any positions yet. Browse open roles on
            the{" "}
            <Link href="/careers" className="font-medium text-violet-600 hover:text-violet-700">
              careers page
            </Link>
            .
          </p>
        </Panel>
      ) : (
        <div className="mt-8 grid gap-4">
          {applications.map((app) => {
            const hasInterview =
              app.stage.includes("interview") &&
              app.interview.status !== "queued";
            const hasOffer = !!app.offer;

            return (
              <Panel key={app.id} className="flex flex-col gap-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h2 className="text-base font-semibold text-gray-900">
                      {app.jobTitle}
                    </h2>
                    <p className="mt-1 text-sm text-gray-500">
                      Submitted {formatShortDate(app.submittedAt)}
                    </p>
                  </div>
                  <StatusPill
                    label={STAGE_LABELS[app.stage]}
                    tone={
                      app.stage.includes("offer")
                        ? "sent"
                        : app.stage.includes("interview")
                          ? "scheduled"
                          : app.stage === "rejected"
                            ? "rejected"
                            : "open"
                    }
                  />
                </div>

                <div className="grid gap-3 sm:grid-cols-3">
                  <div className="rounded-lg border border-gray-100 bg-gray-50 px-4 py-3">
                    <p className="text-xs font-medium text-gray-400">AI Score</p>
                    <p className="mt-1 text-sm font-semibold text-gray-900">
                      {app.score > 0 ? `${app.score}%` : "Pending"}
                    </p>
                  </div>
                  <div className="rounded-lg border border-gray-100 bg-gray-50 px-4 py-3">
                    <p className="text-xs font-medium text-gray-400">Stage</p>
                    <p className="mt-1 text-sm font-semibold text-gray-900">
                      {STAGE_LABELS[app.stage]}
                    </p>
                  </div>
                  <div className="rounded-lg border border-gray-100 bg-gray-50 px-4 py-3">
                    <p className="text-xs font-medium text-gray-400">Interview</p>
                    <p className="mt-1 text-sm font-semibold text-gray-900">
                      {hasInterview
                        ? app.interview.status.charAt(0).toUpperCase() +
                          app.interview.status.slice(1)
                        : "Not scheduled"}
                    </p>
                  </div>
                </div>

                <div className="flex flex-wrap gap-3">
                  {hasInterview && (
                    <Link
                      href={`/app/interviews/${app.interview.id}`}
                      prefetch={false}
                      className="inline-flex items-center rounded-lg bg-violet-600 px-4 py-2 text-sm font-medium text-white hover:bg-violet-700"
                    >
                      View Interview
                    </Link>
                  )}
                  {hasOffer && (
                    <Link
                      href={`/app/offers/${app.offer!.id}`}
                      prefetch={false}
                      className="inline-flex items-center rounded-lg border border-violet-600 px-4 py-2 text-sm font-medium text-violet-600 hover:bg-violet-50"
                    >
                      View Offer
                    </Link>
                  )}
                </div>
              </Panel>
            );
          })}
        </div>
      )}
    </div>
  );
}

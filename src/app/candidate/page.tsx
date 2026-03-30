import Link from "next/link";

import { Panel } from "@/components/ui/panel";
import { StatusPill } from "@/components/ui/status-pill";
import { getViewer } from "@/lib/server/auth";
import { listCandidates } from "@/lib/server/data";
import { formatCurrency, formatLongDateTime, formatShortDate } from "@/lib/utils";

export default async function CandidatePortalPage() {
  const viewer = await getViewer("candidate");
  const candidates = await listCandidates();
  const candidate = candidates.find((entry) => entry.email === viewer?.email) ?? candidates[0];

  return (
    <div className="grid gap-6 xl:grid-cols-[1fr_1.3fr]">
      <div className="grid gap-6">
        <Panel className="flex flex-col gap-5">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="dense-label">Candidate portal</p>
              <h1 className="mt-2 text-2xl font-semibold text-gray-900">
                Welcome, {candidate.fullName.split(" ")[0]}
              </h1>
            </div>
            <StatusPill label={candidate.stage.replaceAll("_", " ")} tone="scheduled" />
          </div>

          {viewer?.isPreview ? (
            <div className="rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-700">
              Preview mode is active because Supabase credentials are not configured yet.
            </div>
          ) : null}

          <div className="grid gap-4">
            <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
              <p className="dense-label">Applied role</p>
              <p className="mt-2 text-sm font-semibold text-gray-900">{candidate.jobTitle}</p>
            </div>
            <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
              <p className="dense-label">Interview status</p>
              <p className="mt-2 text-sm font-semibold text-gray-900">{candidate.interview.status}</p>
              <p className="mt-1 text-sm text-gray-500">
                {candidate.interview.confirmedAt
                  ? formatLongDateTime(candidate.interview.confirmedAt)
                  : "Scheduling is still underway."}
              </p>
            </div>
            <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
              <p className="dense-label">Offer status</p>
              <p className="mt-2 text-sm font-semibold text-gray-900">
                {candidate.offer?.status ?? "Not started"}
              </p>
              {candidate.offer ? (
                <p className="mt-1 text-sm text-gray-500">
                  {formatCurrency(candidate.offer.baseSalary)} · starts{" "}
                  {formatShortDate(candidate.offer.startDate)}
                </p>
              ) : null}
            </div>
          </div>
        </Panel>

        <Panel className="flex flex-col gap-4">
          <p className="dense-label">AI fit summary</p>
          <div className="flex items-end justify-between gap-4">
            <div>
              <p className="text-4xl font-semibold text-indigo-600">
                {candidate.score}
              </p>
              <p className="mt-2 text-sm text-gray-500">Fit score against the applied role</p>
            </div>
            <StatusPill label={candidate.stage.replaceAll("_", " ")} tone="scheduled" />
          </div>
          <p className="text-sm leading-relaxed text-gray-500">{candidate.fitSummary}</p>
        </Panel>
      </div>

      <div className="grid gap-5">
        <Panel className="grid gap-5 md:grid-cols-[1fr_1fr]">
          <div className="flex flex-col gap-4">
            <div>
              <p className="dense-label">AI screening results</p>
              <h2 className="mt-2 text-xl font-semibold text-gray-900">
                Your profile
              </h2>
            </div>
            <p className="text-sm leading-relaxed text-gray-500">
              Strengths and areas for growth identified from your application.
            </p>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <p className="dense-label">Strengths</p>
              <ul className="mt-3 space-y-2 text-sm leading-relaxed text-gray-500">
                {candidate.strengths.map((item) => (
                  <li key={item}>• {item}</li>
                ))}
              </ul>
            </div>
            <div>
              <p className="dense-label">Gaps</p>
              <ul className="mt-3 space-y-2 text-sm leading-relaxed text-gray-500">
                {candidate.gaps.map((item) => (
                  <li key={item}>• {item}</li>
                ))}
              </ul>
            </div>
          </div>
        </Panel>

        <div className="grid gap-4 md:grid-cols-2">
          <Panel className="flex flex-col gap-4">
            <p className="dense-label">Interview actions</p>
            <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
              <p className="text-sm font-semibold text-gray-900">Confirmed interview</p>
              <p className="mt-1 text-sm text-gray-500">
                {candidate.interview.confirmedAt
                  ? formatLongDateTime(candidate.interview.confirmedAt)
                  : "Choose a slot from the proposed options."}
              </p>
            </div>
            <Link
              href={`/interviews/${candidate.interview.id}`}
              prefetch={false}
              className="inline-flex items-center justify-center rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
            >
              Review interview details
            </Link>
          </Panel>

          <Panel className="flex flex-col gap-4">
            <p className="dense-label">Offer actions</p>
            <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
              <p className="text-sm font-semibold text-gray-900">
                {candidate.offer ? "Offer ready for signature" : "Offer not yet available"}
              </p>
              <p className="mt-1 text-sm text-gray-500">
                {candidate.offer
                  ? `${formatCurrency(candidate.offer.baseSalary)} · ${candidate.offer.equity}`
                  : "After the interview debrief, this portal becomes the signing handoff."}
              </p>
            </div>
            {candidate.offer ? (
              <Link
                href={`/offers/${candidate.offer.id}`}
                prefetch={false}
                className="inline-flex items-center justify-center rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                Open offer package
              </Link>
            ) : null}
          </Panel>
        </div>
      </div>
    </div>
  );
}

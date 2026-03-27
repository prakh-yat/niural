import Link from "next/link";

import { PageFrame } from "@/components/shell/page-frame";
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
    <PageFrame>
      <section className="grid gap-6 lg:grid-cols-[0.78fr_1.22fr]">
        <Panel className="flex flex-col gap-6">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="dense-label">Candidate portal</p>
              <h1 className="mt-2 font-display text-[2.3rem] tracking-[-0.05em] text-ink">
                Welcome, {candidate.fullName.split(" ")[0]}
              </h1>
            </div>
            <StatusPill label={candidate.stage.replaceAll("_", " ")} tone="scheduled" />
          </div>
          {viewer?.isPreview ? (
            <div className="rounded-2xl border border-warning/30 bg-warning-soft px-4 py-3 text-sm text-warning">
              Preview mode is active because Supabase credentials are not configured yet.
            </div>
          ) : null}
          <div className="grid gap-4">
            <div className="rounded-[1.4rem] bg-panel-strong p-4">
              <p className="dense-label">Applied role</p>
              <p className="mt-2 text-base font-semibold text-ink">{candidate.jobTitle}</p>
            </div>
            <div className="rounded-[1.4rem] bg-panel-strong p-4">
              <p className="dense-label">Interview status</p>
              <p className="mt-2 text-base font-semibold text-ink">{candidate.interview.status}</p>
              <p className="mt-1 text-sm text-ink-soft">
                {candidate.interview.confirmedAt
                  ? formatLongDateTime(candidate.interview.confirmedAt)
                  : "Scheduling is still underway."}
              </p>
            </div>
            <div className="rounded-[1.4rem] bg-panel-strong p-4">
              <p className="dense-label">Offer status</p>
              <p className="mt-2 text-base font-semibold text-ink">
                {candidate.offer?.status ?? "Not started"}
              </p>
              {candidate.offer ? (
                <p className="mt-1 text-sm text-ink-soft">
                  {formatCurrency(candidate.offer.baseSalary)} · starts{" "}
                  {formatShortDate(candidate.offer.startDate)}
                </p>
              ) : null}
            </div>
          </div>
        </Panel>

        <div className="grid gap-5">
          <Panel className="grid gap-5 md:grid-cols-[0.95fr_1.05fr]">
            <div className="flex flex-col gap-4">
              <div>
                <p className="dense-label">Role fit</p>
                <p className="mt-2 font-display text-5xl tracking-[-0.06em] text-accent">
                  {candidate.score}
                </p>
              </div>
              <p className="text-sm leading-8 text-ink-soft">{candidate.fitSummary}</p>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <p className="dense-label">Strengths</p>
                <ul className="mt-3 space-y-2 text-sm leading-7 text-ink-soft">
                  {candidate.strengths.map((item) => (
                    <li key={item}>• {item}</li>
                  ))}
                </ul>
              </div>
              <div>
                <p className="dense-label">Gaps</p>
                <ul className="mt-3 space-y-2 text-sm leading-7 text-ink-soft">
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
              <div className="rounded-[1.4rem] bg-panel-strong p-4">
                <p className="text-sm font-semibold text-ink">Confirmed interview</p>
                <p className="mt-1 text-sm text-ink-soft">
                  {candidate.interview.confirmedAt
                    ? formatLongDateTime(candidate.interview.confirmedAt)
                    : "Choose a slot from the proposed options."}
                </p>
              </div>
              <Link
                href={`/candidate/interviews/${candidate.interview.id}`}
                className="inline-flex items-center justify-center rounded-full bg-accent px-4 py-3 text-sm font-semibold text-white"
              >
                Review interview details
              </Link>
            </Panel>

            <Panel className="flex flex-col gap-4">
              <p className="dense-label">Offer actions</p>
              <div className="rounded-[1.4rem] bg-panel-strong p-4">
                <p className="text-sm font-semibold text-ink">
                  {candidate.offer ? "Offer ready for signature" : "Offer not yet available"}
                </p>
                <p className="mt-1 text-sm text-ink-soft">
                  {candidate.offer
                    ? `${formatCurrency(candidate.offer.baseSalary)} · ${candidate.offer.equity}`
                    : "After the interview debrief, this portal becomes the signing handoff."}
                </p>
              </div>
              {candidate.offer ? (
                <Link
                  href={`/candidate/offers/${candidate.offer.id}`}
                  className="inline-flex items-center justify-center rounded-full border border-line bg-white px-4 py-3 text-sm font-semibold text-ink"
                >
                  Open offer package
                </Link>
              ) : null}
            </Panel>
          </div>
        </div>
      </section>
    </PageFrame>
  );
}

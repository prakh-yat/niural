import Link from "next/link";
import { notFound } from "next/navigation";

import { PageFrame } from "@/components/shell/page-frame";
import { Panel } from "@/components/ui/panel";
import { StatusPill } from "@/components/ui/status-pill";
import { getCandidateById } from "@/lib/server/data";
import { STAGE_LABELS } from "@/lib/domain";
import { formatCurrency, formatLongDateTime } from "@/lib/utils";

export default async function CandidateDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const candidate = await getCandidateById(id);

  if (!candidate) {
    notFound();
  }

  return (
    <PageFrame>
      <section className="grid gap-6 xl:grid-cols-[0.82fr_1.18fr]">
        <div className="grid gap-5">
          <Panel className="flex flex-col gap-5">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="dense-label">Candidate detail</p>
                <h1 className="mt-2 font-display text-[2.3rem] tracking-[-0.05em] text-ink">
                  {candidate.fullName}
                </h1>
              </div>
              <StatusPill label={STAGE_LABELS[candidate.stage]} tone={candidate.stage} />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="rounded-[1.4rem] bg-panel-strong p-4">
                <p className="dense-label">Applied role</p>
                <p className="mt-2 text-base font-semibold text-ink">{candidate.jobTitle}</p>
              </div>
              <div className="rounded-[1.4rem] bg-panel-strong p-4">
                <p className="dense-label">AI fit</p>
                <p className="mt-2 font-display text-4xl tracking-[-0.05em] text-accent">
                  {candidate.score}
                </p>
              </div>
            </div>
            <p className="text-sm leading-8 text-ink-soft">{candidate.fitSummary}</p>
          </Panel>

          <Panel className="flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <p className="dense-label">Screening analysis</p>
              <form action="/api/ai/screen" method="post">
                <input type="hidden" name="candidateId" value={candidate.id} />
                <button
                  type="submit"
                  className="rounded-full border border-line px-4 py-2 text-xs font-semibold text-ink"
                >
                  Re-run screening
                </button>
              </form>
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
        </div>

        <div className="grid gap-5">
          <Panel className="flex flex-col gap-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="dense-label">Research profile</p>
                <h2 className="mt-2 font-display text-[2rem] tracking-[-0.05em] text-ink">
                  Candidate brief
                </h2>
              </div>
              <form action="/api/research/enrich" method="post">
                <input type="hidden" name="candidateId" value={candidate.id} />
                <button
                  type="submit"
                  className="rounded-full border border-line px-4 py-2 text-xs font-semibold text-ink"
                >
                  Refresh research
                </button>
              </form>
            </div>
            <p className="text-sm leading-8 text-ink-soft">{candidate.research.brief}</p>
            <div className="grid gap-4 md:grid-cols-3">
              <div className="rounded-[1.4rem] bg-panel-strong p-4">
                <p className="dense-label">GitHub</p>
                <p className="mt-2 text-sm leading-7 text-ink-soft">{candidate.research.githubSummary}</p>
              </div>
              <div className="rounded-[1.4rem] bg-panel-strong p-4">
                <p className="dense-label">LinkedIn</p>
                <p className="mt-2 text-sm leading-7 text-ink-soft">{candidate.research.linkedInSummary}</p>
              </div>
              <div className="rounded-[1.4rem] bg-panel-strong p-4">
                <p className="dense-label">X / Public web</p>
                <p className="mt-2 text-sm leading-7 text-ink-soft">{candidate.research.xSummary}</p>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              {candidate.research.sources.map((source) => (
                <a
                  key={source.href}
                  href={source.href}
                  target="_blank"
                  rel="noreferrer"
                  className="rounded-full border border-line px-3 py-2 text-xs font-semibold text-ink-soft"
                >
                  {source.label}
                </a>
              ))}
              <StatusPill label={candidate.research.completeness} tone={candidate.research.completeness} />
            </div>
          </Panel>

          <div className="grid gap-4 md:grid-cols-2">
            <Panel className="flex flex-col gap-4">
              <p className="dense-label">Scheduling</p>
              <div className="rounded-[1.4rem] bg-panel-strong p-4">
                <p className="text-sm font-semibold text-ink">{candidate.interview.status}</p>
                <p className="mt-1 text-sm text-ink-soft">
                  {candidate.interview.confirmedAt
                    ? formatLongDateTime(candidate.interview.confirmedAt)
                    : "No confirmed interview yet"}
                </p>
              </div>
              <form action="/api/scheduling/offers" method="post" className="flex flex-col gap-3">
                <input type="hidden" name="candidateId" value={candidate.id} />
                <button
                  type="submit"
                  className="rounded-full bg-accent px-4 py-3 text-sm font-semibold text-white"
                >
                  Generate interview slots
                </button>
              </form>
            </Panel>

            <Panel className="flex flex-col gap-4">
              <p className="dense-label">Offer</p>
              <div className="rounded-[1.4rem] bg-panel-strong p-4">
                <p className="text-sm font-semibold text-ink">
                  {candidate.offer ? candidate.offer.status : "Not started"}
                </p>
                <p className="mt-1 text-sm text-ink-soft">
                  {candidate.offer
                    ? `${formatCurrency(candidate.offer.baseSalary)} · starts ${formatLongDateTime(candidate.offer.startDate)}`
                    : "Draft after interview completion."}
                </p>
              </div>
              {candidate.offer ? (
                <Link
                  href={`/admin/offers/${candidate.offer.id}`}
                  className="inline-flex items-center justify-center rounded-full border border-line px-4 py-3 text-sm font-semibold text-ink"
                >
                  Open offer workspace
                </Link>
              ) : null}
            </Panel>
          </div>
        </div>
      </section>
    </PageFrame>
  );
}

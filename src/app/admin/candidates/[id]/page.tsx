import Link from "next/link";
import { notFound } from "next/navigation";

import { Panel } from "@/components/ui/panel";
import { StatusPill } from "@/components/ui/status-pill";
import { STAGE_LABELS } from "@/lib/domain";
import { getCandidateById } from "@/lib/server/data";
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
    <section className="grid gap-6 xl:grid-cols-[1fr_1.2fr]">
      <div className="grid gap-5">
        <Panel className="flex flex-col gap-5">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="dense-label">Candidate detail</p>
              <h1 className="mt-2 text-2xl font-semibold text-gray-900">
                {candidate.fullName}
              </h1>
            </div>
            <StatusPill label={STAGE_LABELS[candidate.stage]} tone={candidate.stage} />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
              <p className="dense-label">Applied role</p>
              <p className="mt-2 text-sm font-semibold text-gray-900">{candidate.jobTitle}</p>
            </div>
            <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
              <p className="dense-label">AI fit</p>
              <p className="mt-2 text-2xl font-semibold text-indigo-600">
                {candidate.score}
              </p>
            </div>
          </div>
          <p className="text-sm leading-relaxed text-gray-500">{candidate.fitSummary}</p>
        </Panel>

        <Panel className="flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <p className="dense-label">Screening analysis</p>
            <form action="/api/ai/screen" method="post">
              <input type="hidden" name="candidateId" value={candidate.id} />
              <button
                type="submit"
                className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                Re-run screening
              </button>
            </form>
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
      </div>

      <div className="grid gap-5">
        <Panel className="flex flex-col gap-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="dense-label">Research profile</p>
              <h2 className="mt-2 text-xl font-semibold text-gray-900">
                Candidate brief
              </h2>
            </div>
            <form action="/api/research/enrich" method="post">
              <input type="hidden" name="candidateId" value={candidate.id} />
              <button
                type="submit"
                className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                Refresh research
              </button>
            </form>
          </div>
          <p className="text-sm leading-relaxed text-gray-500">{candidate.research.brief}</p>
          <div className="grid gap-4 md:grid-cols-3">
            <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
              <p className="dense-label">GitHub</p>
              <p className="mt-2 text-sm leading-relaxed text-gray-500">{candidate.research.githubSummary}</p>
            </div>
            <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
              <p className="dense-label">LinkedIn</p>
              <p className="mt-2 text-sm leading-relaxed text-gray-500">{candidate.research.linkedInSummary}</p>
            </div>
            <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
              <p className="dense-label">X / Public web</p>
              <p className="mt-2 text-sm leading-relaxed text-gray-500">{candidate.research.xSummary}</p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            {candidate.research.sources.map((source) => (
              <a
                key={source.href}
                href={source.href}
                target="_blank"
                rel="noreferrer"
                className="rounded-lg border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-500 hover:bg-gray-50"
              >
                {source.label}
              </a>
            ))}
            <StatusPill label={candidate.research.completeness} tone={candidate.research.completeness} />
          </div>
        </Panel>

        {candidate.interview.transcriptSummary ? (
          <Panel className="flex flex-col gap-3">
            <p className="dense-label">Interview transcript summary</p>
            <p className="text-sm leading-relaxed text-gray-500">
              {candidate.interview.transcriptSummary}
            </p>
          </Panel>
        ) : null}

        <div className="grid gap-4 md:grid-cols-2">
          <Panel className="flex flex-col gap-4">
            <p className="dense-label">Scheduling</p>
            <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
              <p className="text-sm font-semibold text-gray-900">{candidate.interview.status}</p>
              <p className="mt-1 text-sm text-gray-500">
                {candidate.interview.confirmedAt
                  ? formatLongDateTime(candidate.interview.confirmedAt)
                  : "No confirmed interview yet"}
              </p>
            </div>
            <form action="/api/scheduling/offers" method="post" className="flex flex-col gap-3">
              <input type="hidden" name="candidateId" value={candidate.id} />
              <input type="hidden" name="notifyCandidate" value="1" />
              <button
                type="submit"
                className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
              >
                {candidate.interview.offeredSlots.length > 0
                  ? "Refresh availability and resend invite"
                  : "Send scheduling invite"}
              </button>
            </form>

            {candidate.interview.status === "scheduled" ? (
              <form action="/api/interviews/complete" method="post">
                <input type="hidden" name="interviewId" value={candidate.interview.id} />
                <button
                  type="submit"
                  className="w-full rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                >
                  Mark interview completed
                </button>
              </form>
            ) : null}

            {candidate.stage === "interview_completed" && !candidate.offer ? (
              <form action="/api/offers/create" method="post">
                <input type="hidden" name="applicationId" value={candidate.id} />
                <button
                  type="submit"
                  className="w-full rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
                >
                  Create offer draft
                </button>
              </form>
            ) : null}
          </Panel>

          <Panel className="flex flex-col gap-4">
            <p className="dense-label">Offer</p>
            <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
              <p className="text-sm font-semibold text-gray-900">
                {candidate.offer ? candidate.offer.status : "Not started"}
              </p>
              <p className="mt-1 text-sm text-gray-500">
                {candidate.offer
                  ? `${formatCurrency(candidate.offer.baseSalary)} · starts ${formatLongDateTime(candidate.offer.startDate)}`
                  : "Draft after interview completion."}
              </p>
            </div>
            {candidate.offer ? (
              <Link
                href={`/offers/${candidate.offer.id}`}
                className="inline-flex items-center justify-center rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                Open offer workspace
              </Link>
            ) : null}
          </Panel>
        </div>
      </div>
    </section>
  );
}

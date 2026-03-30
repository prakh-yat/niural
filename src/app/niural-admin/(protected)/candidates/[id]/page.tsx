import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";

import { CandidateStageManager } from "@/components/admin/candidate-stage-manager";
import { FlashBanner } from "@/components/ui/flash-banner";
import { Panel } from "@/components/ui/panel";
import { StatusPill } from "@/components/ui/status-pill";
import { STAGE_LABELS } from "@/lib/domain";
import { getCandidateById } from "@/lib/server/data";
import { FLASH_COOKIE_NAMES, readFlashMessage } from "@/lib/server/flash";
import { formatCurrency, formatLongDateTime } from "@/lib/utils";

function formatSalaryTargets(min?: number, max?: number) {
  if (min && max) {
    return `${formatCurrency(min)} - ${formatCurrency(max)}`;
  }

  if (min) {
    return `${formatCurrency(min)}+`;
  }

  if (max) {
    return `Up to ${formatCurrency(max)}`;
  }

  return "No salary range set";
}

export default async function CandidateDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [candidate, flash] = await Promise.all([
    getCandidateById(id),
    readFlashMessage(FLASH_COOKIE_NAMES.adminCandidate),
  ]);

  if (!candidate) {
    notFound();
  }

  const adminNotes = (candidate.statusHistory ?? []).filter(
    (entry) => entry.visibility === "admin" || entry.actor === "admin",
  );
  const scoreColor =
    candidate.score >= 75
      ? "text-emerald-600"
      : candidate.score >= 50
        ? "text-amber-600"
        : "text-red-600";

  return (
    <div className="mx-auto max-w-7xl space-y-8">
      {flash ? <FlashBanner cookieName={FLASH_COOKIE_NAMES.adminCandidate} flash={flash} /> : null}

      <nav className="flex items-center gap-2 text-sm text-gray-400">
        <Link href="/niural-admin" prefetch={false} className="transition hover:text-violet-600">
          Dashboard
        </Link>
        <span>/</span>
        <span className="text-gray-600">{candidate.fullName}</span>
      </nav>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
        <Panel className="overflow-hidden p-0">
          <div className="flex flex-col gap-5 px-8 py-8">
            <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
              <div className="flex items-start gap-4">
                {candidate.profile.avatarUrl ? (
                  <Image
                    src={candidate.profile.avatarUrl}
                    alt={`${candidate.fullName} avatar`}
                    width={72}
                    height={72}
                    unoptimized
                    className="h-[4.5rem] w-[4.5rem] rounded-[1.35rem] object-cover"
                  />
                ) : (
                  <div className="flex h-[4.5rem] w-[4.5rem] items-center justify-center rounded-[1.35rem] bg-violet-100 text-lg font-semibold text-violet-700">
                    {candidate.fullName
                      .split(" ")
                      .map((part) => part[0])
                      .join("")
                      .slice(0, 2)
                      .toUpperCase()}
                  </div>
                )}

                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.22em] text-gray-400">
                    Candidate detail
                  </p>
                  <h1 className="mt-2 text-[2rem] font-semibold tracking-[-0.03em] text-gray-950">
                    {candidate.fullName}
                  </h1>
                  <p className="mt-2 text-base text-gray-500">{candidate.email}</p>
                </div>
              </div>

              <StatusPill label={STAGE_LABELS[candidate.stage]} tone={candidate.stage} />
            </div>
          </div>

          <div className="grid gap-6 border-t border-gray-100 px-8 py-6 md:grid-cols-2">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-gray-400">
                Applied role
              </p>
              <p className="mt-3 text-xl font-semibold text-gray-900">{candidate.jobTitle}</p>
            </div>

            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-gray-400">
                AI fit score
              </p>
              <p className={`mt-2 text-4xl font-semibold ${scoreColor}`}>{candidate.score}</p>
            </div>

            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-gray-400">
                Candidate preferences
              </p>
              <p className="mt-3 text-base font-semibold text-gray-900">
                {candidate.profile.headline || "No role headline set"}
              </p>
              <p className="mt-1 text-sm text-gray-500">
                {candidate.profile.preferredLocation || "No preferred location set"}
              </p>
              {candidate.profile.skills.length > 0 ? (
                <div className="mt-4 flex flex-wrap gap-2">
                  {candidate.profile.skills.map((skill) => (
                    <span
                      key={skill}
                      className="rounded-full bg-gray-100 px-2.5 py-1 text-xs font-medium text-gray-600"
                    >
                      {skill}
                    </span>
                  ))}
                </div>
              ) : null}
            </div>

            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-gray-400">
                Salary targets
              </p>
              <p className="mt-3 text-base font-semibold text-gray-900">
                {formatSalaryTargets(
                  candidate.profile.desiredSalaryMin,
                  candidate.profile.desiredSalaryMax,
                )}
              </p>
            </div>
          </div>

          <div className="space-y-4 border-t border-gray-100 px-8 py-6">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-gray-400">
                Fit summary
              </p>
              <p className="mt-3 max-w-4xl text-base leading-8 text-gray-600">
                {candidate.fitSummary}
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              {candidate.linkedInUrl ? (
                <a
                  href={candidate.linkedInUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="rounded-full border border-gray-200 px-4 py-2 text-sm font-medium text-gray-600 transition hover:bg-gray-50 hover:text-gray-900"
                >
                  LinkedIn
                </a>
              ) : null}
              {candidate.portfolioUrl ? (
                <a
                  href={candidate.portfolioUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="rounded-full border border-gray-200 px-4 py-2 text-sm font-medium text-gray-600 transition hover:bg-gray-50 hover:text-gray-900"
                >
                  Portfolio
                </a>
              ) : null}
            </div>
          </div>

          <div className="border-t border-gray-100 px-8 py-6">
            <CandidateStageManager
              applicationId={candidate.id}
              candidateName={candidate.fullName}
              currentStage={candidate.stage}
            />
          </div>
        </Panel>

        <Panel className="overflow-hidden p-0">
          <div className="flex flex-col gap-4 px-8 py-8 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-gray-400">
                Research profile
              </p>
              <h2 className="mt-2 text-[1.75rem] font-semibold tracking-[-0.03em] text-gray-950">
                Candidate brief
              </h2>
            </div>

            <form action="/api/research/enrich" method="post">
              <input type="hidden" name="candidateId" value={candidate.id} />
              <button
                type="submit"
                className="rounded-xl border border-gray-200 px-4 py-2.5 text-sm font-medium text-gray-700 transition hover:bg-gray-50"
              >
                Refresh research
              </button>
            </form>
          </div>

          <div className="space-y-6 border-t border-gray-100 px-8 py-6">
            <p className="text-base leading-8 text-gray-600">{candidate.research.brief}</p>

            <div className="grid gap-6 md:grid-cols-3">
              <div className="space-y-3">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-gray-400">
                  GitHub
                </p>
                <p className="text-sm leading-7 text-gray-500">{candidate.research.githubSummary}</p>
              </div>

              <div className="space-y-3">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-gray-400">
                  LinkedIn
                </p>
                <p className="text-sm leading-7 text-gray-500">{candidate.research.linkedInSummary}</p>
              </div>

              <div className="space-y-3">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-gray-400">
                  X / public web
                </p>
                <p className="text-sm leading-7 text-gray-500">{candidate.research.xSummary}</p>
              </div>
            </div>

            {candidate.research.discrepancies.length > 0 ? (
              <div className="rounded-2xl border border-amber-200 bg-amber-50 px-5 py-4">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-amber-700">
                  Discrepancy flags
                </p>
                <ul className="mt-3 space-y-2 text-sm leading-7 text-amber-900">
                  {candidate.research.discrepancies.map((flag) => (
                    <li key={flag}>- {flag}</li>
                  ))}
                </ul>
              </div>
            ) : null}

            <div className="flex flex-wrap gap-2">
              {candidate.research.sources.map((source) => (
                <a
                  key={source.href}
                  href={source.href}
                  target="_blank"
                  rel="noreferrer"
                  className="rounded-full border border-gray-200 px-3.5 py-1.5 text-xs font-medium text-gray-600 transition hover:bg-gray-50 hover:text-gray-900"
                >
                  {source.label}
                </a>
              ))}
              <StatusPill
                label={candidate.research.completeness}
                tone={candidate.research.completeness}
              />
            </div>
          </div>
        </Panel>
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
        <Panel className="overflow-hidden p-0">
          <div className="flex flex-col gap-4 px-8 py-8 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-gray-400">
                Screening analysis
              </p>
              <h2 className="mt-2 text-[1.75rem] font-semibold tracking-[-0.03em] text-gray-950">
                Strengths and gaps
              </h2>
            </div>

            <form action="/api/ai/screen" method="post">
              <input type="hidden" name="candidateId" value={candidate.id} />
              <button
                type="submit"
                className="rounded-xl border border-gray-200 px-4 py-2.5 text-sm font-medium text-gray-700 transition hover:bg-gray-50"
              >
                Re-run screening
              </button>
            </form>
          </div>

          <div className="grid gap-8 border-t border-gray-100 px-8 py-6 md:grid-cols-2">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-gray-400">
                Strengths
              </p>
              <ul className="mt-4 space-y-3 text-sm leading-8 text-gray-600">
                {candidate.strengths.map((item) => (
                  <li key={item} className="flex gap-3">
                    <span className="mt-3 h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-400" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-gray-400">
                Gaps
              </p>
              <ul className="mt-4 space-y-3 text-sm leading-8 text-gray-600">
                {candidate.gaps.map((item) => (
                  <li key={item} className="flex gap-3">
                    <span className="mt-3 h-1.5 w-1.5 shrink-0 rounded-full bg-red-400" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {candidate.interview.transcriptSummary ? (
            <div className="space-y-4 border-t border-gray-100 px-8 py-6">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-gray-400">
                    Interview transcript summary
                  </p>
                  <p className="mt-3 text-sm leading-7 text-gray-600">
                    {candidate.interview.transcriptSummary}
                  </p>
                </div>
                {candidate.interview.transcriptDecision ? (
                  <StatusPill
                    label={candidate.interview.transcriptDecision}
                    tone={candidate.interview.transcriptDecision === "selected" ? "shortlisted" : "rejected"}
                    className="capitalize"
                  />
                ) : null}
              </div>

              {candidate.interview.transcriptExcerpt ? (
                <p className="rounded-2xl bg-gray-50 px-5 py-4 text-sm italic leading-7 text-gray-500">
                  &ldquo;{candidate.interview.transcriptExcerpt}&rdquo;
                </p>
              ) : null}

              {candidate.interview.transcriptTurns?.length ? (
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-gray-400">
                    Stored conversation
                  </p>
                  <div className="mt-4 space-y-3 rounded-[1.5rem] border border-gray-200 bg-white px-5 py-5">
                    {candidate.interview.transcriptTurns.map((turn, index) => (
                      <div key={`${turn.speaker}-${index}`} className="rounded-2xl bg-gray-50 px-4 py-3">
                        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-gray-400">
                          {turn.speaker}
                        </p>
                        <p className="mt-2 text-sm leading-7 text-gray-700">{turn.text}</p>
                      </div>
                    ))}
                  </div>
                </div>
              ) : candidate.interview.transcriptText ? (
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-gray-400">
                    Stored conversation
                  </p>
                  <pre className="mt-4 overflow-x-auto whitespace-pre-wrap rounded-[1.5rem] border border-gray-200 bg-white px-5 py-5 text-sm leading-7 text-gray-700">
                    {candidate.interview.transcriptText}
                  </pre>
                </div>
              ) : null}
            </div>
          ) : null}
        </Panel>

        <Panel className="overflow-hidden p-0">
          <div className="px-8 py-8">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-gray-400">
              Hiring flow
            </p>
            <h2 className="mt-2 text-[1.75rem] font-semibold tracking-[-0.03em] text-gray-950">
              Scheduling, offer, and internal notes
            </h2>
          </div>

          <div className="space-y-0 border-t border-gray-100">
            <section className="space-y-6 px-8 py-6">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-gray-400">
                  Scheduling
                </p>
              </div>

              <div className="grid gap-6 sm:grid-cols-2">
                <div>
                  <p className="text-sm font-semibold text-gray-900 capitalize">
                    {candidate.interview.status}
                  </p>
                  <p className="mt-2 text-sm leading-7 text-gray-500">
                    {candidate.interview.confirmedAt
                      ? formatLongDateTime(candidate.interview.confirmedAt)
                      : "No confirmed interview yet."}
                  </p>
                </div>

                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-gray-400">
                    Interviewer
                  </p>
                  <p className="mt-3 text-sm font-semibold text-gray-900">
                    {candidate.interview.interviewerName ||
                      "Assigned from the connected calendar when slots are generated"}
                  </p>
                  {candidate.interview.interviewerEmail ? (
                    <p className="mt-1 text-sm text-gray-500">{candidate.interview.interviewerEmail}</p>
                  ) : null}
                  {candidate.interview.meetingUrl ? (
                    <a
                      href={candidate.interview.meetingUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="mt-3 inline-flex text-sm font-medium text-violet-600 transition hover:text-violet-800"
                    >
                      Join meeting
                    </a>
                  ) : null}
                </div>
              </div>

              {candidate.interview.offeredSlots.length > 0 ? (
                <div className="space-y-3">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-gray-400">
                    Availability preview
                  </p>
                  <div className="grid gap-3 md:grid-cols-2">
                    {candidate.interview.offeredSlots.map((slot) => (
                      <div
                        key={slot.startsAt}
                        className="flex items-start justify-between gap-3 rounded-2xl border border-gray-200 px-4 py-3"
                      >
                        <p className="text-sm leading-6 text-gray-600">{slot.label}</p>
                        <StatusPill
                          label={slot.status}
                          tone={slot.status}
                          className="shrink-0 capitalize"
                        />
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}

              {candidate.interview.rescheduleRequest?.approvalStatus === "pending" ? (
                <div className="space-y-4 rounded-[1.5rem] border border-amber-200 bg-amber-50 px-5 py-5">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-amber-700">
                        Alternative-time request
                      </p>
                      <p className="mt-2 text-sm leading-7 text-amber-900">
                        Candidate requested a different time. The current offered slots remain held
                        until you approve a replacement or the candidate confirms one.
                      </p>
                    </div>
                    <StatusPill label="Pending approval" tone="pending_approval" />
                  </div>

                  {candidate.interview.rescheduleRequest.rescheduleNotes ? (
                    <p className="rounded-2xl bg-white/80 px-4 py-3 text-sm leading-7 text-amber-950">
                      Candidate note: {candidate.interview.rescheduleRequest.rescheduleNotes}
                    </p>
                  ) : null}

                  {candidate.interview.rescheduleRequest.proposedSlots.length > 0 ? (
                    <div className="grid gap-3 md:grid-cols-2">
                      {candidate.interview.rescheduleRequest.proposedSlots.map((slot) => (
                        <div
                          key={slot.startsAt}
                          className="flex items-start justify-between gap-3 rounded-2xl border border-amber-200 bg-white px-4 py-3"
                        >
                          <p className="text-sm leading-6 text-gray-700">{slot.label}</p>
                          <StatusPill
                            label={slot.status}
                            tone={slot.status}
                            className="shrink-0 capitalize"
                          />
                        </div>
                      ))}
                    </div>
                  ) : null}

                  <div className="grid gap-3 sm:grid-cols-2">
                    <form action="/api/scheduling/reschedule-review" method="post">
                      <input type="hidden" name="interviewId" value={candidate.interview.id} />
                      <input type="hidden" name="decision" value="approve" />
                      <button
                        type="submit"
                        className="w-full rounded-xl bg-violet-600 px-4 py-3 text-sm font-medium text-white transition hover:bg-violet-700"
                      >
                        Approve and send updated invite
                      </button>
                    </form>

                    <form action="/api/scheduling/reschedule-review" method="post">
                      <input type="hidden" name="interviewId" value={candidate.interview.id} />
                      <input type="hidden" name="decision" value="decline" />
                      <button
                        type="submit"
                        className="w-full rounded-xl border border-amber-300 bg-white px-4 py-3 text-sm font-medium text-amber-900 transition hover:bg-amber-100"
                      >
                        Find next best option
                      </button>
                    </form>
                  </div>
                </div>
              ) : candidate.interview.rescheduleRequest?.approvalStatus === "declined" &&
                candidate.interview.rescheduleRequest.proposedSlots.length > 0 ? (
                <div className="space-y-4 rounded-[1.5rem] border border-sky-200 bg-sky-50 px-5 py-5">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-sky-700">
                        AI reschedule follow-up
                      </p>
                      <p className="mt-2 text-sm leading-7 text-sky-950">
                        The interviewer declined the earlier alternate request. The candidate is now
                        reviewing a new held time picked from current calendar availability.
                      </p>
                    </div>
                    <StatusPill label="Candidate decision pending" tone="scheduled" />
                  </div>

                  {candidate.interview.rescheduleRequest.aiMessage ? (
                    <p className="rounded-2xl bg-white/80 px-4 py-3 text-sm leading-7 text-sky-950">
                      AI message: {candidate.interview.rescheduleRequest.aiMessage}
                    </p>
                  ) : null}

                  <div className="grid gap-3 md:grid-cols-2">
                    {candidate.interview.rescheduleRequest.proposedSlots.map((slot) => (
                      <div
                        key={slot.startsAt}
                        className="flex items-start justify-between gap-3 rounded-2xl border border-sky-200 bg-white px-4 py-3"
                      >
                        <p className="text-sm leading-6 text-gray-700">{slot.label}</p>
                        <StatusPill
                          label={slot.status}
                          tone={slot.status}
                          className="shrink-0 capitalize"
                        />
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}

              <div className="grid gap-3">
                <form action="/api/scheduling/offers" method="post">
                  <input type="hidden" name="candidateId" value={candidate.id} />
                  <input type="hidden" name="notifyCandidate" value="1" />
                  <button
                    type="submit"
                    className="w-full rounded-xl bg-violet-600 px-4 py-3 text-sm font-medium text-white transition hover:bg-violet-700"
                  >
                    {candidate.interview.offeredSlots.length > 0
                      ? "Refresh availability and resend invite"
                      : "Send scheduling invite"}
                  </button>
                </form>
                <p className="text-sm leading-6 text-gray-500">
                  The invite email is only sent when an admin triggers it. Availability comes from
                  the connected Google Calendar.
                </p>

                {candidate.interview.status === "scheduled" ? (
                  <form action="/api/interviews/complete" method="post">
                    <input type="hidden" name="interviewId" value={candidate.interview.id} />
                    <button
                      type="submit"
                      className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm font-medium text-gray-700 transition hover:bg-gray-50"
                    >
                      Mark interview completed
                    </button>
                  </form>
                ) : null}
              </div>
            </section>

            <section className="space-y-5 border-t border-gray-100 px-8 py-6">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-gray-400">
                  Offer
                </p>
              </div>

              <div>
                <p className="text-sm font-semibold text-gray-900">
                  {candidate.offer ? candidate.offer.status : "Not started"}
                </p>
                <p className="mt-2 text-sm leading-7 text-gray-500">
                  {candidate.offer
                    ? `${formatCurrency(candidate.offer.baseSalary)} · starts ${formatLongDateTime(candidate.offer.startDate)}`
                    : "Draft after interview completion."}
                </p>
              </div>

              {candidate.offer ? (
                <Link
                  href={`/niural-admin/offers/${candidate.offer.id}`}
                  prefetch={false}
                  className="inline-flex items-center rounded-xl border border-violet-200 bg-violet-50 px-4 py-2.5 text-sm font-medium text-violet-700 transition hover:bg-violet-100"
                >
                  Open offer workspace
                </Link>
              ) : null}

              {candidate.stage === "interview_completed" && !candidate.offer ? (
                <form action="/api/offers/create" method="post">
                  <input type="hidden" name="applicationId" value={candidate.id} />
                  <button
                    type="submit"
                    className="rounded-xl bg-violet-600 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-violet-700"
                  >
                    Create offer draft
                  </button>
                </form>
              ) : null}
            </section>

            <section className="space-y-5 border-t border-gray-100 px-8 py-6">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-gray-400">
                  Admin notes
                </p>
                <h3 className="mt-2 text-lg font-semibold text-gray-900">Stage override history</h3>
              </div>

              {adminNotes.length === 0 ? (
                <p className="text-sm leading-7 text-gray-500">
                  No internal override notes have been recorded for this application yet.
                </p>
              ) : (
                <div className="space-y-4">
                  {adminNotes
                    .slice()
                    .reverse()
                    .map((entry) => (
                      <div
                        key={`${entry.stage}-${entry.at}-${entry.note}`}
                        className="border-l-2 border-violet-100 pl-4"
                      >
                        <div className="flex flex-wrap items-center gap-3">
                          <StatusPill
                            label={STAGE_LABELS[entry.stage as keyof typeof STAGE_LABELS] ?? entry.stage}
                            tone={entry.stage}
                          />
                          <p className="text-xs text-gray-400">{formatLongDateTime(entry.at)}</p>
                        </div>
                        <p className="mt-3 text-sm leading-7 text-gray-600">{entry.note}</p>
                      </div>
                    ))}
                </div>
              )}
            </section>
          </div>
        </Panel>
      </div>
    </div>
  );
}

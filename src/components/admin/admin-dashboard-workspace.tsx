"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";

import { StatusPill } from "@/components/ui/status-pill";
import { STAGE_LABELS, type ApplicationStageKey } from "@/lib/domain";
import { formatShortDate } from "@/lib/utils";

type DashboardCandidate = {
  id: string;
  fullName: string;
  email: string;
  jobTitle: string;
  submittedAt: string;
  score: number;
  stage: ApplicationStageKey;
};

type DashboardProps = {
  candidates: DashboardCandidate[];
  openRoles: number;
  roleOptions: string[];
};

type DashboardStatusFilter =
  | "all"
  | "applied"
  | "screened"
  | "shortlisted"
  | "in_interview"
  | "offer"
  | "rejected";

function ScoreBadge({ score }: { score: number }) {
  const color =
    score >= 75
      ? "bg-emerald-50 text-emerald-700"
      : score >= 50
        ? "bg-amber-50 text-amber-700"
        : "bg-red-50 text-red-700";

  return (
    <span
      className={`inline-flex min-w-[2.75rem] items-center justify-center rounded-full px-2.5 py-1 text-xs font-bold ${color}`}
    >
      {score}
    </span>
  );
}

function getCandidateSignal(score: number) {
  if (score >= 75) {
    return { label: "Best fit", tone: "best_fit" };
  }

  if (score < 50) {
    return { label: "Needs review", tone: "needs_review" };
  }

  return null;
}

function matchesStatusFilter(stage: ApplicationStageKey, filter: DashboardStatusFilter) {
  switch (filter) {
    case "all":
      return true;
    case "applied":
      return stage === "applied";
    case "screened":
      return stage === "screened";
    case "shortlisted":
      return stage === "shortlisted";
    case "in_interview":
      return (
        stage === "interview_pending" ||
        stage === "interview_scheduled" ||
        stage === "interview_completed"
      );
    case "offer":
      return stage === "offer_drafting" || stage === "offer_sent" || stage === "offer_signed";
    case "rejected":
      return stage === "rejected";
    default:
      return true;
  }
}

function CandidateTable({
  candidates,
  emptyMessage,
}: {
  candidates: DashboardCandidate[];
  emptyMessage: string;
}) {
  const router = useRouter();

  if (candidates.length === 0) {
    return <div className="px-6 py-16 text-center text-sm text-gray-400">{emptyMessage}</div>;
  }

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full">
        <thead className="bg-gray-50/70">
          <tr className="text-left text-[11px] font-semibold uppercase tracking-[0.2em] text-gray-400">
            <th className="px-6 py-4">Candidate</th>
            <th className="px-6 py-4">Role</th>
            <th className="px-6 py-4">Submitted</th>
            <th className="px-6 py-4">AI Score</th>
            <th className="px-6 py-4">Status</th>
            <th className="px-6 py-4">Signals</th>
          </tr>
        </thead>
        <tbody>
          {candidates.map((candidate) => {
            const signal = getCandidateSignal(candidate.score);
            const openCandidate = () => router.push(`/niural-admin/candidates/${candidate.id}`);

            return (
              <tr
                key={candidate.id}
                tabIndex={0}
                onClick={openCandidate}
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    openCandidate();
                  }
                }}
                className="group cursor-pointer border-t border-gray-100 text-sm text-gray-600 outline-none transition hover:bg-violet-50/35 focus-visible:bg-violet-50/45"
              >
                <td className="px-6 py-4">
                  <p className="font-semibold text-gray-900 transition group-hover:text-violet-700">
                    {candidate.fullName}
                  </p>
                  <p className="mt-1 text-xs text-gray-400">{candidate.email}</p>
                </td>
                <td className="px-6 py-4 text-gray-500">{candidate.jobTitle}</td>
                <td className="px-6 py-4 text-gray-500">{formatShortDate(candidate.submittedAt)}</td>
                <td className="px-6 py-4">
                  <ScoreBadge score={candidate.score} />
                </td>
                <td className="px-6 py-4">
                  <StatusPill label={STAGE_LABELS[candidate.stage]} tone={candidate.stage} />
                </td>
                <td className="px-6 py-4">
                  {signal ? (
                    <StatusPill label={signal.label} tone={signal.tone} />
                  ) : (
                    <span className="text-xs font-medium text-gray-400">No flag</span>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

export function AdminDashboardWorkspace({
  candidates,
  openRoles,
  roleOptions,
}: DashboardProps) {
  const [role, setRole] = useState("all");
  const [status, setStatus] = useState<DashboardStatusFilter>("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  const filteredCandidates = useMemo(() => {
    return candidates.filter((candidate) => {
      if (role !== "all" && candidate.jobTitle !== role) {
        return false;
      }

      if (!matchesStatusFilter(candidate.stage, status)) {
        return false;
      }

      const submittedAt = new Date(candidate.submittedAt);
      if (dateFrom) {
        const start = new Date(`${dateFrom}T00:00:00`);
        if (submittedAt < start) {
          return false;
        }
      }

      if (dateTo) {
        const end = new Date(`${dateTo}T23:59:59`);
        if (submittedAt > end) {
          return false;
        }
      }

      return true;
    });
  }, [candidates, dateFrom, dateTo, role, status]);

  const bestFitCount = filteredCandidates.filter((candidate) => candidate.score >= 75).length;
  const needsReviewCount = filteredCandidates.filter((candidate) => candidate.score < 50).length;

  return (
    <div className="mx-auto max-w-7xl space-y-8">
      <div>
        <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">
          Admin Dashboard
        </p>
        <h1 className="mt-1 text-2xl font-semibold text-gray-900">Hiring Control Room</h1>
        <p className="mt-1 text-sm text-gray-500">
          Review candidates, filter the pipeline, and open the full profile directly from the list.
        </p>
      </div>

      <section className="overflow-hidden rounded-[1.75rem] border border-gray-200 bg-white shadow-[0_24px_64px_rgba(15,23,42,0.04)]">
        <div className="border-b border-gray-100 px-6 py-6 lg:px-8">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-gray-400">
                Application list
              </p>
              <h2 className="mt-2 text-xl font-semibold text-gray-900">
                All hiring activity in one view
              </h2>
              <p className="mt-2 max-w-3xl text-sm leading-6 text-gray-500">
                Best-fit and needs-review candidates are highlighted as tags in the list so the
                team can scan quickly without jumping between separate cards.
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-semibold text-gray-600">
                {filteredCandidates.length} applications
              </span>
              <span className="rounded-full bg-violet-50 px-3 py-1 text-xs font-semibold text-violet-700">
                {openRoles} open roles
              </span>
              <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
                {bestFitCount} best fit
              </span>
              <span className="rounded-full bg-red-50 px-3 py-1 text-xs font-semibold text-red-700">
                {needsReviewCount} needs review
              </span>
            </div>
          </div>

          <div className="mt-6 grid gap-3 lg:grid-cols-[1.2fr_1fr_1fr_1fr_auto]">
            <label className="grid gap-1.5 text-sm font-medium text-gray-700">
              Role
              <select
                value={role}
                onChange={(event) => setRole(event.target.value)}
                className="rounded-xl border border-gray-200 bg-white px-3 py-3 text-sm text-gray-900 outline-none transition focus:border-violet-400 focus:ring-4 focus:ring-violet-500/10"
              >
                <option value="all">All roles</option>
                {roleOptions.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </label>

            <label className="grid gap-1.5 text-sm font-medium text-gray-700">
              Status
              <select
                value={status}
                onChange={(event) => setStatus(event.target.value as DashboardStatusFilter)}
                className="rounded-xl border border-gray-200 bg-white px-3 py-3 text-sm text-gray-900 outline-none transition focus:border-violet-400 focus:ring-4 focus:ring-violet-500/10"
              >
                <option value="all">All statuses</option>
                <option value="applied">Applied</option>
                <option value="screened">Screened</option>
                <option value="shortlisted">Shortlisted</option>
                <option value="in_interview">In Interview</option>
                <option value="offer">Offer</option>
                <option value="rejected">Rejected</option>
              </select>
            </label>

            <label className="grid gap-1.5 text-sm font-medium text-gray-700">
              Date from
              <input
                type="date"
                value={dateFrom}
                onChange={(event) => setDateFrom(event.target.value)}
                className="rounded-xl border border-gray-200 bg-white px-3 py-3 text-sm text-gray-900 outline-none transition focus:border-violet-400 focus:ring-4 focus:ring-violet-500/10"
              />
            </label>

            <label className="grid gap-1.5 text-sm font-medium text-gray-700">
              Date to
              <input
                type="date"
                value={dateTo}
                onChange={(event) => setDateTo(event.target.value)}
                className="rounded-xl border border-gray-200 bg-white px-3 py-3 text-sm text-gray-900 outline-none transition focus:border-violet-400 focus:ring-4 focus:ring-violet-500/10"
              />
            </label>

            <div className="flex items-end">
              <button
                type="button"
                onClick={() => {
                  setRole("all");
                  setStatus("all");
                  setDateFrom("");
                  setDateTo("");
                }}
                className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm font-medium text-gray-600 transition hover:bg-gray-50 hover:text-gray-900"
              >
                Reset filters
              </button>
            </div>
          </div>
        </div>

        <CandidateTable
          candidates={filteredCandidates}
          emptyMessage="No applications match the current filter combination."
        />
      </section>
    </div>
  );
}

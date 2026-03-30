"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { formatDistanceToNow } from "date-fns";
import { MapPin, Search, Sparkles } from "lucide-react";

import { JobSearchAiDialog } from "@/components/jobs/job-search-ai-dialog";
import { Panel } from "@/components/ui/panel";
import { StatusPill } from "@/components/ui/status-pill";
import type { JobRecord } from "@/lib/domain";

type PublicJobsWorkspaceProps = {
  jobs: JobRecord[];
  filterOptions: {
    teams: string[];
    locations: string[];
    remotes: string[];
    experiences: string[];
  };
};

type JobWithCompensation = JobRecord & {
  compensationMin?: number;
  compensationMax?: number;
};

function parseCompensationBand(band: string) {
  const matches = band.match(/\$?([\d,]+)(?:k)?/gi) ?? [];
  const numbers = matches
    .map((match) => {
      const normalized = match.replace(/[^0-9k]/gi, "").toLowerCase();
      if (!normalized) return null;
      if (normalized.endsWith("k")) {
        return Number(normalized.slice(0, -1)) * 1000;
      }
      return Number(normalized.replace(/,/g, ""));
    })
    .filter((value): value is number => typeof value === "number" && !Number.isNaN(value));

  if (numbers.length === 0) {
    return {};
  }

  return {
    min: Math.min(...numbers),
    max: Math.max(...numbers),
  };
}

function formatJobStatus(status: JobRecord["status"]) {
  return status.charAt(0).toUpperCase() + status.slice(1);
}

function getAiLabel(rank: number | undefined) {
  if (rank == null || rank < 0) {
    return null;
  }

  return rank === 0 ? "Top AI pick" : "AI recommended";
}

export function PublicJobsWorkspace({
  jobs: initialJobs,
  filterOptions,
}: PublicJobsWorkspaceProps) {
  const [query, setQuery] = useState("");
  const [location, setLocation] = useState("");
  const [team, setTeam] = useState("");
  const [remote, setRemote] = useState("");
  const [experience, setExperience] = useState("");
  const [salaryMin, setSalaryMin] = useState("");
  const [salaryMax, setSalaryMax] = useState("");
  const [page, setPage] = useState(1);
  const [aiPrompt, setAiPrompt] = useState("");
  const [aiSummary, setAiSummary] = useState<string | null>(null);
  const [aiRankedIds, setAiRankedIds] = useState<string[]>([]);
  const [aiPending, setAiPending] = useState(false);

  useEffect(() => {
    setPage(1);
  }, [query, location, team, remote, experience, salaryMin, salaryMax, aiPrompt]);

  const jobs = initialJobs.map((job) => {
    const compensation = parseCompensationBand(job.compensationBand);

    return {
      ...job,
      compensationMin: compensation.min,
      compensationMax: compensation.max,
    } satisfies JobWithCompensation;
  });

  const filteredJobs = jobs.filter((job) => {
    const searchHaystack = [
      job.title,
      job.team,
      job.location,
      job.remoteLabel,
      job.experienceLevel,
      job.overview,
      ...job.requirements,
      ...job.responsibilities,
    ]
      .join(" ")
      .toLowerCase();

    if (query.trim() && !searchHaystack.includes(query.trim().toLowerCase())) {
      return false;
    }

    if (location && job.location !== location) {
      return false;
    }

    if (team && job.team !== team) {
      return false;
    }

    if (remote && job.remoteLabel !== remote) {
      return false;
    }

    if (experience && job.experienceLevel !== experience) {
      return false;
    }

    const parsedSalaryMin = Number(salaryMin);
    const parsedSalaryMax = Number(salaryMax);

    if (salaryMin && job.compensationMax && job.compensationMax < parsedSalaryMin) {
      return false;
    }

    if (salaryMax && job.compensationMin && job.compensationMin > parsedSalaryMax) {
      return false;
    }

    return true;
  });

  const orderedJobs = [...filteredJobs].sort((left, right) => {
    if (aiPrompt && aiRankedIds.length > 0) {
      const leftRank = aiRankedIds.indexOf(left.id);
      const rightRank = aiRankedIds.indexOf(right.id);

      if (leftRank !== -1 && rightRank !== -1) {
        return leftRank - rightRank;
      }

      if (leftRank !== -1) return -1;
      if (rightRank !== -1) return 1;
    }

    return new Date(right.postedAt).getTime() - new Date(left.postedAt).getTime();
  });
  const aiRankLookup = new Map(aiRankedIds.map((id, index) => [id, index]));

  const pageCount = Math.max(1, Math.ceil(orderedJobs.length / 10));
  const currentPage = Math.min(page, pageCount);
  const paginatedJobs = orderedJobs.slice((currentPage - 1) * 10, currentPage * 10);

  async function runAiSearch(prompt: string) {
    setAiPending(true);

    try {
      const response = await fetch("/api/jobs/search-ai", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          prompt,
          jobIds: filteredJobs.map((job) => job.id),
          jobs: filteredJobs,
          scope: "public",
        }),
      });

      if (!response.ok) {
        return;
      }

      const data = (await response.json()) as {
        topJobIds: string[];
        summary: string | null;
      };

      setAiPrompt(prompt.trim());
      setAiSummary(data.summary ?? null);
      setAiRankedIds(data.topJobIds ?? []);
    } finally {
      setAiPending(false);
    }
  }

  function clearAiSearch() {
    setAiPrompt("");
    setAiSummary(null);
    setAiRankedIds([]);
  }

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-gray-400">
          Jobs
        </p>
        <h1 className="mt-2 text-3xl font-semibold tracking-[-0.04em] text-gray-950">
          Browse live roles
        </h1>
        <p className="mt-2 text-sm leading-7 text-gray-500">
          Search, filter, and re-rank open roles while still seeing paused postings that may
          reopen soon.
        </p>
      </div>

      <Panel className="rounded-[1.75rem] p-6">
        <div className="flex flex-col gap-5 xl:flex-row xl:items-center xl:justify-between">
          <div className="flex-1">
            <div className="relative">
              <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <input
                type="search"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search by title, team, skill, or keyword"
                className="w-full rounded-xl border border-gray-200 bg-white px-11 py-3 text-sm text-gray-900 outline-none transition focus:border-violet-400 focus:ring-4 focus:ring-violet-500/10"
              />
            </div>
          </div>

          <JobSearchAiDialog
            activePrompt={aiPrompt}
            pending={aiPending}
            onSubmit={runAiSearch}
            onClear={clearAiSearch}
          />
        </div>

        <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-6">
          <select
            value={location}
            onChange={(event) => setLocation(event.target.value)}
            className="rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-sm text-gray-600"
          >
            <option value="">All locations</option>
            {filterOptions.locations.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>

          <select
            value={team}
            onChange={(event) => setTeam(event.target.value)}
            className="rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-sm text-gray-600"
          >
            <option value="">All teams</option>
            {filterOptions.teams.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>

          <select
            value={remote}
            onChange={(event) => setRemote(event.target.value)}
            className="rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-sm text-gray-600"
          >
            <option value="">Any work mode</option>
            {filterOptions.remotes.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>

          <select
            value={experience}
            onChange={(event) => setExperience(event.target.value)}
            className="rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-sm text-gray-600"
          >
            <option value="">All levels</option>
            {filterOptions.experiences.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>

          <input
            type="number"
            value={salaryMin}
            onChange={(event) => setSalaryMin(event.target.value)}
            placeholder="Salary min"
            className="rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-sm text-gray-600"
          />

          <input
            type="number"
            value={salaryMax}
            onChange={(event) => setSalaryMax(event.target.value)}
            placeholder="Salary max"
            className="rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-sm text-gray-600"
          />
        </div>

        {aiPrompt ? (
          <div className="mt-5 rounded-xl border border-violet-200 bg-violet-50 px-4 py-3">
            <p className="text-xs font-semibold uppercase tracking-wider text-violet-600">
              AI job recommendations
            </p>
            <p className="mt-1 text-sm text-violet-900">
              Showing tailored results for: <span className="font-medium">{aiPrompt}</span>
            </p>
            {aiSummary ? <p className="mt-1 text-sm text-violet-700">{aiSummary}</p> : null}
          </div>
        ) : null}
      </Panel>

      <Panel className="overflow-hidden rounded-[1.75rem] p-0">
        <div className="border-b border-gray-100 px-6 py-4">
          <h2 className="text-base font-semibold text-gray-900">
            {orderedJobs.length} role{orderedJobs.length === 1 ? "" : "s"} in view
          </h2>
        </div>

        {paginatedJobs.length === 0 ? (
          <div className="px-6 py-12 text-center">
            <p className="text-base font-semibold text-gray-900">No jobs match this view.</p>
            <p className="mt-2 text-sm text-gray-500">Adjust your search or filters and try again.</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {paginatedJobs.map((job) => {
              const aiLabel = getAiLabel(aiRankLookup.get(job.id));

              return (
                <div key={job.id} className="px-6 py-6">
                  <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
                    <div className="max-w-4xl">
                      <div className="flex flex-wrap items-center gap-3 text-sm text-gray-500">
                        <span>
                          Posted {formatDistanceToNow(new Date(job.postedAt), { addSuffix: true })}
                        </span>
                        <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-600">
                          {job.team}
                        </span>
                        <StatusPill label={formatJobStatus(job.status)} tone={job.status} />
                        <span className="inline-flex items-center gap-1.5">
                          <MapPin className="h-4 w-4" />
                          {job.location}
                        </span>
                      </div>

                      <Link href={`/jobs/${job.slug}`} className="mt-3 block">
                        <h3 className="text-2xl font-semibold tracking-[-0.03em] text-gray-950 transition hover:text-violet-700">
                          {job.title}
                        </h3>
                      </Link>

                      <p className="mt-3 text-base leading-8 text-gray-600">{job.overview}</p>

                      <div className="mt-4 flex flex-wrap gap-2">
                        {aiLabel ? (
                          <span className="inline-flex items-center gap-2 rounded-full bg-violet-50 px-3 py-1 text-xs font-semibold text-violet-700">
                            <Sparkles className="h-3.5 w-3.5" />
                            {aiLabel}
                          </span>
                        ) : null}
                        {job.requirements.slice(0, 5).map((item) => (
                          <span
                            key={item}
                            className="rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-600"
                          >
                            {item.split(" ").slice(0, 4).join(" ")}
                          </span>
                        ))}
                      </div>

                      <div className="mt-4 flex flex-wrap items-center gap-4 text-sm text-gray-500">
                        <span>{job.compensationBand}</span>
                        <span>{job.experienceLevel}</span>
                        <span>{job.remoteLabel}</span>
                      </div>
                    </div>

                    <div className="flex shrink-0 flex-col gap-3 xl:items-end">
                      {aiPrompt && aiLabel ? (
                        <span className="inline-flex items-center gap-2 rounded-full bg-emerald-50 px-4 py-2 text-sm font-semibold text-emerald-700">
                          <Sparkles className="h-4 w-4" />
                          {aiLabel}
                        </span>
                      ) : null}

                      <Link
                        href={`/jobs/${job.slug}`}
                        className="inline-flex items-center justify-center rounded-lg bg-violet-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-violet-700"
                      >
                        {job.status === "open" ? "View full role" : "View details"}
                      </Link>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <div className="flex items-center justify-between border-t border-gray-100 px-6 py-4">
          <p className="text-sm text-gray-500">
            Page {currentPage} of {pageCount}
          </p>
          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={currentPage === 1}
              onClick={() => setPage((current) => Math.max(1, current - 1))}
              className="rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-600 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Previous
            </button>
            <button
              type="button"
              disabled={currentPage === pageCount}
              onClick={() => setPage((current) => Math.min(pageCount, current + 1))}
              className="rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-600 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Next
            </button>
          </div>
        </div>
      </Panel>
    </div>
  );
}

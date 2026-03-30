import Link from "next/link";

import { StatusPill } from "@/components/ui/status-pill";
import { getViewer } from "@/lib/server/auth";
import { STAGE_LABELS } from "@/lib/domain";
import { env } from "@/lib/env";
import { listCandidates, listJobs } from "@/lib/server/data";
import { formatShortDate } from "@/lib/utils";

export default async function AdminPage() {
  const viewer = await getViewer("admin");
  const [candidates, jobs] = await Promise.all([listCandidates(), listJobs()]);
  const openJobs = jobs.filter((job) => job.status === "open").length;
  const shortlisted = candidates.filter(
    (candidate) => candidate.score >= env.AUTO_SHORTLIST_THRESHOLD,
  ).length;

  return (
    <div className="grid gap-6 xl:grid-cols-[1.35fr_0.65fr]">
      <div className="grid gap-6">
        <section className="grid gap-4 rounded-lg border border-gray-200 bg-white p-6 md:grid-cols-[1.05fr_0.95fr] md:p-7">
          <div className="flex flex-col gap-5">
            <div>
              <p className="dense-label">Operations console</p>
              <h1 className="mt-2 text-2xl font-semibold text-gray-900">
                Hiring control room
              </h1>
              <p className="mt-4 max-w-2xl text-sm leading-6 text-gray-500">
                Manage applications, screen candidates, schedule interviews, and route offers.
              </p>
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
              <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
                <p className="dense-label">Applications</p>
                <p className="mt-2 text-2xl font-semibold text-gray-900">
                  {candidates.length}
                </p>
              </div>
              <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
                <p className="dense-label">Open roles</p>
                <p className="mt-2 text-2xl font-semibold text-gray-900">
                  {openJobs}
                </p>
              </div>
              <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
                <p className="dense-label">Shortlisted</p>
                <p className="mt-2 text-2xl font-semibold text-gray-900">
                  {shortlisted}
                </p>
              </div>
            </div>
          </div>

          <div className="rounded-lg border border-gray-200 bg-gray-50 p-5">
            <p className="dense-label">Access mode</p>
            <div className="mt-4 flex flex-wrap items-center gap-3">
              <StatusPill
                label={viewer?.isPreview ? "preview" : viewer?.role ?? "admin"}
                tone={viewer?.isPreview ? "preview" : "open"}
              />
              <span className="text-sm text-gray-500">
                {viewer?.isPreview
                  ? "Preview demo mode is active until external credentials are configured."
                  : "Authenticated internal workspace is active."}
              </span>
            </div>

            <div className="mt-5 border-t border-gray-200 pt-5">
              <p className="text-sm font-semibold text-gray-900">System rules</p>
              <ul className="mt-3 space-y-2 text-sm leading-6 text-gray-500">
                <li>Duplicate applications blocked per email + role</li>
                <li>Auto-shortlist when AI score meets threshold</li>
                <li>Calendar slots held until candidate confirms</li>
              </ul>
            </div>
          </div>
        </section>

        <div className="flex flex-col gap-4 rounded-lg border border-gray-200 bg-white">
          <div className="flex flex-col gap-4 border-b border-gray-200 px-6 py-5 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="dense-label">Application queue</p>
              <h2 className="mt-2 text-xl font-semibold text-gray-900">
                Candidate table
              </h2>
            </div>
            <div className="flex flex-wrap gap-2">
              {["All roles", "Shortlisted", "In interview", "Offer"].map((filter) => (
                <span
                  key={filter}
                  className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-1.5 text-xs font-semibold text-gray-500"
                >
                  {filter}
                </span>
              ))}
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead className="bg-gray-50">
                <tr className="text-left text-xs font-semibold uppercase tracking-wide text-gray-400">
                  <th className="px-5 py-3">Candidate</th>
                  <th className="px-5 py-3">Role</th>
                  <th className="px-5 py-3">Submitted</th>
                  <th className="px-5 py-3">AI score</th>
                  <th className="px-5 py-3">Status</th>
                  <th className="px-5 py-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {candidates.map((candidate) => (
                  <tr key={candidate.id} className="border-t border-gray-200 text-sm text-gray-500 hover:bg-gray-50">
                    <td className="px-5 py-4">
                      <div>
                        <p className="font-semibold text-gray-900">{candidate.fullName}</p>
                        <p className="text-xs text-gray-400">{candidate.email}</p>
                      </div>
                    </td>
                    <td className="px-5 py-4">{candidate.jobTitle}</td>
                    <td className="px-5 py-4">{formatShortDate(candidate.submittedAt)}</td>
                    <td className="px-5 py-4 font-semibold text-indigo-600">{candidate.score}</td>
                    <td className="px-5 py-4">
                      <StatusPill label={STAGE_LABELS[candidate.stage]} tone={candidate.stage} />
                    </td>
                    <td className="px-5 py-4">
                      <Link href={`/candidates/${candidate.id}`} className="font-semibold text-indigo-600">
                        Open
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <aside className="grid gap-6">
        <div className="flex flex-col gap-4 rounded-lg border border-gray-200 bg-white p-5">
          <p className="dense-label">Open roles</p>
          <div className="grid gap-3">
            {jobs.map((job) => (
              <div
                key={job.id}
                className="rounded-lg border border-gray-200 bg-gray-50 px-4 py-4"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-gray-900">{job.title}</p>
                    <p className="mt-1 text-xs text-gray-400">
                      {job.team} · {job.location}
                    </p>
                  </div>
                  <StatusPill label={job.status} tone={job.status} className="capitalize" />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="flex flex-col gap-4 rounded-lg border border-gray-200 bg-white p-5">
          <p className="dense-label">State model</p>
          <div className="grid gap-3">
            {[
              "Applied -> Screened",
              "Screened -> Shortlisted",
              "Shortlisted -> Interview",
              "Interview -> Offer",
              "Offer -> Signed -> Onboarded",
            ].map((step) => (
              <div key={step} className="rounded-lg border border-gray-200 bg-gray-50 px-4 py-3">
                <p className="text-sm text-gray-600">{step}</p>
              </div>
            ))}
          </div>
        </div>
      </aside>
    </div>
  );
}

import { formatDistanceToNow } from "date-fns";

import { FlashBanner } from "@/components/ui/flash-banner";
import { Panel } from "@/components/ui/panel";
import { StatusPill } from "@/components/ui/status-pill";
import { JOB_STATUSES, type JobStatusKey } from "@/lib/domain";
import { listAdminJobs } from "@/lib/server/data";
import { FLASH_COOKIE_NAMES, readFlashMessage } from "@/lib/server/flash";

function formatJobStatus(status: JobStatusKey) {
  return status.charAt(0).toUpperCase() + status.slice(1);
}

export default async function AdminJobsPage() {
  const [jobs, flash] = await Promise.all([
    listAdminJobs(),
    readFlashMessage(FLASH_COOKIE_NAMES.adminJobs),
  ]);

  const openJobs = jobs.filter((job) => job.status === "open").length;
  const pausedJobs = jobs.filter((job) => job.status === "paused").length;
  const closedJobs = jobs.filter((job) => job.status === "closed").length;

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-gray-400">
          Job listings
        </p>
        <h1 className="mt-2 text-2xl font-semibold text-gray-950">Manage live roles</h1>
        <p className="mt-2 text-sm leading-7 text-gray-500">
          Create new postings, pause intake, or close roles without losing the full job
          description.
        </p>
      </div>

      {flash ? <FlashBanner cookieName={FLASH_COOKIE_NAMES.adminJobs} flash={flash} /> : null}

      <section className="grid gap-4 md:grid-cols-4">
        <Panel>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-gray-400">
            Total listings
          </p>
          <p className="mt-3 text-3xl font-semibold text-gray-950">{jobs.length}</p>
        </Panel>
        <Panel>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-gray-400">Open</p>
          <p className="mt-3 text-3xl font-semibold text-emerald-700">{openJobs}</p>
        </Panel>
        <Panel>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-gray-400">Paused</p>
          <p className="mt-3 text-3xl font-semibold text-amber-700">{pausedJobs}</p>
        </Panel>
        <Panel>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-gray-400">Closed</p>
          <p className="mt-3 text-3xl font-semibold text-red-700">{closedJobs}</p>
        </Panel>
      </section>

      <section className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
        <Panel className="space-y-5">
          <div>
            <p className="text-sm font-semibold text-gray-950">Create a job posting</p>
            <p className="mt-1 text-sm text-gray-500">
              New roles are published with a full JD and become available to candidates based on
              the status you set here.
            </p>
          </div>

          <form action="/api/admin/jobs" method="post" className="space-y-4">
            <input type="hidden" name="intent" value="create" />

            <div className="grid gap-4 md:grid-cols-2">
              <label className="grid gap-2 text-sm font-medium text-gray-900">
                Job title
                <input
                  type="text"
                  name="title"
                  required
                  placeholder="Senior Product Designer"
                  className="rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm outline-none transition focus:border-violet-500"
                />
              </label>
              <label className="grid gap-2 text-sm font-medium text-gray-900">
                Team
                <input
                  type="text"
                  name="team"
                  required
                  placeholder="Design"
                  className="rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm outline-none transition focus:border-violet-500"
                />
              </label>
              <label className="grid gap-2 text-sm font-medium text-gray-900">
                Location
                <input
                  type="text"
                  name="location"
                  required
                  placeholder="Remote (US)"
                  className="rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm outline-none transition focus:border-violet-500"
                />
              </label>
              <label className="grid gap-2 text-sm font-medium text-gray-900">
                Work mode
                <input
                  type="text"
                  name="remoteLabel"
                  required
                  placeholder="Remote"
                  className="rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm outline-none transition focus:border-violet-500"
                />
              </label>
              <label className="grid gap-2 text-sm font-medium text-gray-900">
                Experience level
                <input
                  type="text"
                  name="experienceLevel"
                  required
                  placeholder="Senior"
                  className="rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm outline-none transition focus:border-violet-500"
                />
              </label>
              <label className="grid gap-2 text-sm font-medium text-gray-900">
                Compensation band
                <input
                  type="text"
                  name="compensationBand"
                  required
                  placeholder="$150,000 - $190,000"
                  className="rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm outline-none transition focus:border-violet-500"
                />
              </label>
              <label className="grid gap-2 text-sm font-medium text-gray-900 md:col-span-2">
                Status
                <select
                  name="status"
                  defaultValue="open"
                  className="rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm outline-none transition focus:border-violet-500"
                >
                  {JOB_STATUSES.map((status) => (
                    <option key={status} value={status}>
                      {formatJobStatus(status)}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <label className="grid gap-2 text-sm font-medium text-gray-900">
              Overview
              <textarea
                name="overview"
                required
                rows={4}
                placeholder="Describe the impact, team context, and what success looks like in this role."
                className="rounded-lg border border-gray-300 bg-white px-3 py-3 text-sm outline-none transition focus:border-violet-500"
              />
            </label>

            <label className="grid gap-2 text-sm font-medium text-gray-900">
              Responsibilities
              <textarea
                name="responsibilities"
                required
                rows={5}
                placeholder={"One responsibility per line\nLead roadmap planning\nPartner with engineering"}
                className="rounded-lg border border-gray-300 bg-white px-3 py-3 text-sm outline-none transition focus:border-violet-500"
              />
            </label>

            <label className="grid gap-2 text-sm font-medium text-gray-900">
              Requirements
              <textarea
                name="requirements"
                required
                rows={5}
                placeholder={"One requirement per line\n5+ years in B2B SaaS\nStrong written communication"}
                className="rounded-lg border border-gray-300 bg-white px-3 py-3 text-sm outline-none transition focus:border-violet-500"
              />
            </label>

            <label className="grid gap-2 text-sm font-medium text-gray-900">
              Differentiators
              <textarea
                name="differentiators"
                required
                rows={4}
                placeholder={"One differentiator per line\nHigh ownership\nDirect access to leadership"}
                className="rounded-lg border border-gray-300 bg-white px-3 py-3 text-sm outline-none transition focus:border-violet-500"
              />
            </label>

            <label className="grid gap-2 text-sm font-medium text-gray-900">
              AI leverage summary
              <textarea
                name="aiLeverageSummary"
                rows={3}
                placeholder="Optional: describe how AI supports the work in this role."
                className="rounded-lg border border-gray-300 bg-white px-3 py-3 text-sm outline-none transition focus:border-violet-500"
              />
            </label>

            <button
              type="submit"
              className="inline-flex items-center justify-center rounded-lg bg-violet-600 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-violet-700"
            >
              Create posting
            </button>
          </form>
        </Panel>

        <Panel className="overflow-hidden p-0">
          <div className="border-b border-gray-200 px-6 py-5">
            <p className="text-sm font-semibold text-gray-950">All job listings</p>
            <p className="mt-1 text-sm text-gray-500">
              Open roles accept applications, paused roles stay visible, and closed roles are
              removed from public intake.
            </p>
          </div>

          {jobs.length === 0 ? (
            <div className="px-6 py-10 text-sm text-gray-500">No job listings available.</div>
          ) : (
            <div className="divide-y divide-gray-200">
              {jobs.map((job) => (
                <div key={job.id} className="grid gap-4 px-6 py-5 lg:grid-cols-[1.15fr_0.75fr]">
                  <div className="space-y-3">
                    <div className="flex flex-wrap items-center gap-3">
                      <p className="text-base font-semibold text-gray-950">{job.title}</p>
                      <StatusPill label={formatJobStatus(job.status)} tone={job.status} />
                    </div>
                    <div className="flex flex-wrap items-center gap-3 text-sm text-gray-500">
                      <span>{job.team}</span>
                      <span>{job.location}</span>
                      <span>{job.remoteLabel}</span>
                      <span>{job.experienceLevel}</span>
                    </div>
                    <p className="text-sm leading-7 text-gray-600">{job.overview}</p>
                    <p className="text-xs font-medium uppercase tracking-[0.18em] text-gray-400">
                      Posted {formatDistanceToNow(new Date(job.postedAt), { addSuffix: true })}
                    </p>
                  </div>

                  <div className="space-y-4 rounded-2xl border border-gray-200 bg-gray-50 px-4 py-4">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-gray-400">
                        Compensation
                      </p>
                      <p className="mt-1 text-sm font-medium text-gray-900">{job.compensationBand}</p>
                    </div>

                    <form action="/api/admin/jobs" method="post" className="space-y-3">
                      <input type="hidden" name="intent" value="update-status" />
                      <input type="hidden" name="jobId" value={job.id} />
                      <label className="grid gap-2 text-sm font-medium text-gray-900">
                        Listing status
                        <select
                          name="status"
                          defaultValue={job.status}
                          className="rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm outline-none transition focus:border-violet-500"
                        >
                          {JOB_STATUSES.map((status) => (
                            <option key={status} value={status}>
                              {formatJobStatus(status)}
                            </option>
                          ))}
                        </select>
                      </label>
                      <button
                        type="submit"
                        className="inline-flex items-center justify-center rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-100"
                      >
                        Save status
                      </button>
                    </form>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Panel>
      </section>
    </div>
  );
}

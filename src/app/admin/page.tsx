import Link from "next/link";

import { PageFrame } from "@/components/shell/page-frame";
import { Panel } from "@/components/ui/panel";
import { StatusPill } from "@/components/ui/status-pill";
import { getViewer } from "@/lib/server/auth";
import { listCandidates, listJobs } from "@/lib/server/data";
import { STAGE_LABELS } from "@/lib/domain";
import { formatShortDate } from "@/lib/utils";

export default async function AdminPage() {
  const viewer = await getViewer("admin");
  const [candidates, jobs] = await Promise.all([listCandidates(), listJobs()]);
  const openJobs = jobs.filter((job) => job.status === "open").length;

  return (
    <PageFrame>
      <section className="grid gap-6 lg:grid-cols-[0.82fr_1.18fr]">
        <Panel className="flex flex-col gap-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="dense-label">Admin workspace</p>
              <h1 className="mt-2 font-display text-[2.4rem] tracking-[-0.05em] text-ink">
                Hiring control room
              </h1>
            </div>
            <StatusPill label={viewer?.isPreview ? "preview" : viewer?.role ?? "admin"} tone={viewer?.isPreview ? "preview" : "open"} />
          </div>
          <p className="text-sm leading-8 text-ink-soft">
            Dense table-first admin UX with clear state transitions, override notes, research brief access, and links into scheduling and offer flows.
          </p>
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="rounded-[1.4rem] bg-panel-strong p-4">
              <p className="dense-label">Applications</p>
              <p className="mt-2 font-display text-4xl tracking-[-0.06em] text-ink">{candidates.length}</p>
            </div>
            <div className="rounded-[1.4rem] bg-panel-strong p-4">
              <p className="dense-label">Open roles</p>
              <p className="mt-2 font-display text-4xl tracking-[-0.06em] text-ink">{openJobs}</p>
            </div>
            <div className="rounded-[1.4rem] bg-panel-strong p-4">
              <p className="dense-label">Shortlisted</p>
              <p className="mt-2 font-display text-4xl tracking-[-0.06em] text-ink">
                {candidates.filter((candidate) => candidate.score >= 75).length}
              </p>
            </div>
          </div>
        </Panel>

        <Panel className="flex flex-col gap-4">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="dense-label">Filters</p>
              <h2 className="mt-2 font-display text-[2rem] tracking-[-0.05em] text-ink">
                Application queue
              </h2>
            </div>
            <div className="flex flex-wrap gap-2">
              {["All roles", "Shortlisted", "In interview", "Offer"].map((filter) => (
                <span
                  key={filter}
                  className="rounded-full border border-line bg-panel px-3 py-2 text-xs font-semibold text-ink-soft"
                >
                  {filter}
                </span>
              ))}
            </div>
          </div>
          <div className="table-shell overflow-x-auto">
            <table className="min-w-full">
              <thead className="bg-panel-strong">
                <tr className="text-left text-xs font-semibold uppercase tracking-[0.14em] text-ink-muted">
                  <th className="px-5 py-4">Candidate</th>
                  <th className="px-5 py-4">Role</th>
                  <th className="px-5 py-4">Submitted</th>
                  <th className="px-5 py-4">AI score</th>
                  <th className="px-5 py-4">Status</th>
                  <th className="px-5 py-4">Actions</th>
                </tr>
              </thead>
              <tbody>
                {candidates.map((candidate) => (
                  <tr key={candidate.id} className="border-t border-line text-sm text-ink-soft">
                    <td className="px-5 py-4">
                      <div>
                        <p className="font-semibold text-ink">{candidate.fullName}</p>
                        <p className="text-xs text-ink-muted">{candidate.email}</p>
                      </div>
                    </td>
                    <td className="px-5 py-4">{candidate.jobTitle}</td>
                    <td className="px-5 py-4">{formatShortDate(candidate.submittedAt)}</td>
                    <td className="px-5 py-4 font-semibold text-accent">{candidate.score}</td>
                    <td className="px-5 py-4">
                      <StatusPill label={STAGE_LABELS[candidate.stage]} tone={candidate.stage} />
                    </td>
                    <td className="px-5 py-4">
                      <Link
                        href={`/admin/candidates/${candidate.id}`}
                        className="font-semibold text-accent-strong"
                      >
                        Open
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Panel>
      </section>
    </PageFrame>
  );
}

import Link from "next/link";

import { PageFrame } from "@/components/shell/page-frame";
import { Panel } from "@/components/ui/panel";
import { SectionHeading } from "@/components/ui/section-heading";
import { StatusPill } from "@/components/ui/status-pill";
import { listJobs } from "@/lib/server/data";

export default async function CareersPage() {
  const jobs = await listJobs();

  return (
    <PageFrame>
      <section className="grid gap-8 lg:grid-cols-[0.8fr_1.2fr]">
        <SectionHeading
          eyebrow="Career portal"
          title="Three openings, full JDs, structured applications."
          body="Each role page carries the full role context the screening workflow needs later. The public experience is cleaner than a generic job board, but dense enough to feel like a real operator product."
        />
        <Panel className="flex flex-col gap-4 bg-gradient-to-br from-white to-panel-tint">
          <p className="dense-label">Application fields</p>
          <div className="grid gap-3 sm:grid-cols-2">
            {[
              "Full name",
              "Email",
              "LinkedIn URL",
              "Portfolio / GitHub",
              "Role selection",
              "Resume upload",
            ].map((field) => (
              <div key={field} className="rounded-2xl border border-line bg-white px-4 py-3 text-sm font-medium text-ink-soft">
                {field}
              </div>
            ))}
          </div>
        </Panel>
      </section>

      <section className="grid gap-4">
        {jobs.map((job) => (
          <div
            key={job.id}
            className="table-shell grid gap-6 border border-line bg-white p-6 md:grid-cols-[1.2fr_0.8fr]"
          >
            <div className="flex flex-col gap-4">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="dense-label">{job.team}</p>
                  <h2 className="mt-2 font-display text-[2rem] tracking-[-0.05em] text-ink md:text-[2.8rem]">
                    {job.title}
                  </h2>
                </div>
                <StatusPill label={job.status} tone={job.status} className="capitalize" />
              </div>
              <p className="max-w-3xl text-sm leading-8 text-ink-soft">{job.overview}</p>
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <p className="dense-label">Responsibilities</p>
                  <ul className="mt-3 space-y-2 text-sm leading-7 text-ink-soft">
                    {job.responsibilities.map((item) => (
                      <li key={item}>• {item}</li>
                    ))}
                  </ul>
                </div>
                <div>
                  <p className="dense-label">Requirements</p>
                  <ul className="mt-3 space-y-2 text-sm leading-7 text-ink-soft">
                    {job.requirements.map((item) => (
                      <li key={item}>• {item}</li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>

            <div className="flex flex-col justify-between gap-6 rounded-[1.5rem] bg-panel-strong p-5">
              <div className="grid gap-4">
                <div>
                  <p className="dense-label">Location</p>
                  <p className="mt-2 text-sm font-medium text-ink-soft">{job.location}</p>
                </div>
                <div>
                  <p className="dense-label">Remote</p>
                  <p className="mt-2 text-sm font-medium text-ink-soft">{job.remoteLabel}</p>
                </div>
                <div>
                  <p className="dense-label">Experience</p>
                  <p className="mt-2 text-sm font-medium text-ink-soft">{job.experienceLevel}</p>
                </div>
                <div>
                  <p className="dense-label">Compensation</p>
                  <p className="mt-2 text-sm font-medium text-ink-soft">{job.compensationBand}</p>
                </div>
              </div>
              <div className="flex flex-col gap-3">
                <Link
                  href={`/careers/${job.slug}`}
                  className="inline-flex items-center justify-center rounded-full border border-line bg-white px-4 py-3 text-sm font-semibold text-ink"
                >
                  View full role
                </Link>
                <Link
                  href={`/apply/${job.id}`}
                  className="inline-flex items-center justify-center rounded-full bg-accent px-4 py-3 text-sm font-semibold text-white"
                >
                  Apply now
                </Link>
              </div>
            </div>
          </div>
        ))}
      </section>
    </PageFrame>
  );
}

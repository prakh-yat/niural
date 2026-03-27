import { notFound } from "next/navigation";

import { PageFrame } from "@/components/shell/page-frame";
import { Panel } from "@/components/ui/panel";
import { StatusPill } from "@/components/ui/status-pill";
import { getJobById } from "@/lib/server/data";

export default async function ApplyPage({
  params,
}: {
  params: Promise<{ jobId: string }>;
}) {
  const { jobId } = await params;
  const job = await getJobById(jobId);

  if (!job) {
    notFound();
  }

  return (
    <PageFrame>
      <section className="grid gap-6 lg:grid-cols-[0.95fr_1.05fr]">
        <Panel className="flex flex-col gap-6 bg-gradient-to-b from-white to-panel-tint">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="dense-label">Applying for</p>
              <h1 className="mt-2 font-display text-[2.3rem] tracking-[-0.05em] text-ink">
                {job.title}
              </h1>
            </div>
            <StatusPill label={job.remoteLabel} tone="open" />
          </div>
          <p className="text-sm leading-8 text-ink-soft">{job.overview}</p>
          <div className="grid gap-3">
            {[
              "Duplicate applications are blocked by email + role.",
              "Only PDF and DOCX resumes are accepted.",
              "Successful submit triggers confirmation email and AI screening.",
              "If the role is paused before submit completes, the request is rejected safely.",
            ].map((item) => (
              <div key={item} className="rounded-2xl border border-line bg-white px-4 py-3 text-sm text-ink-soft">
                {item}
              </div>
            ))}
          </div>
        </Panel>

        <form
          action="/api/applications"
          method="post"
          encType="multipart/form-data"
          className="rounded-[2rem] border border-line bg-white p-6 shadow-[0_20px_46px_rgba(19,25,38,0.06)] md:p-8"
        >
          <input type="hidden" name="jobId" value={job.id} />
          <div className="flex flex-col gap-2">
            <p className="dense-label">Candidate application</p>
            <h2 className="font-display text-[2rem] tracking-[-0.05em] text-ink">Structured application</h2>
            <p className="text-sm leading-7 text-ink-soft">
              This form feeds the entire pipeline: screening, research, scheduling, and onboarding.
            </p>
          </div>

          <div className="mt-8 grid gap-4 md:grid-cols-2">
            <label className="flex flex-col gap-2 text-sm font-medium text-ink">
              Full name
              <input
                type="text"
                name="fullName"
                required
                className="rounded-2xl border border-line bg-panel px-4 py-3 text-ink outline-none transition focus:border-accent"
              />
            </label>
            <label className="flex flex-col gap-2 text-sm font-medium text-ink">
              Email
              <input
                type="email"
                name="email"
                required
                className="rounded-2xl border border-line bg-panel px-4 py-3 text-ink outline-none transition focus:border-accent"
              />
            </label>
            <label className="flex flex-col gap-2 text-sm font-medium text-ink">
              LinkedIn URL
              <input
                type="url"
                name="linkedInUrl"
                required
                className="rounded-2xl border border-line bg-panel px-4 py-3 text-ink outline-none transition focus:border-accent"
              />
            </label>
            <label className="flex flex-col gap-2 text-sm font-medium text-ink">
              Portfolio / GitHub
              <input
                type="url"
                name="portfolioUrl"
                className="rounded-2xl border border-line bg-panel px-4 py-3 text-ink outline-none transition focus:border-accent"
              />
            </label>
          </div>

          <div className="mt-4 grid gap-4">
            <label className="flex flex-col gap-2 text-sm font-medium text-ink">
              Role selection
              <select
                name="jobIdSelect"
                defaultValue={job.id}
                className="rounded-2xl border border-line bg-panel px-4 py-3 text-ink outline-none transition focus:border-accent"
              >
                <option value={job.id}>{job.title}</option>
              </select>
            </label>
            <label className="flex flex-col gap-2 text-sm font-medium text-ink">
              Resume upload
              <input
                type="file"
                name="resume"
                accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                required
                className="rounded-2xl border border-dashed border-line-strong bg-panel px-4 py-4 text-sm text-ink-soft"
              />
            </label>
          </div>

          <div className="mt-8 flex items-center justify-between gap-4 border-t border-line pt-6">
            <p className="max-w-md text-sm leading-7 text-ink-soft">
              Submission creates a candidate account, sends a confirmation email, and enqueues AI screening and research.
            </p>
            <button
              type="submit"
              className="rounded-full bg-accent px-5 py-3 text-sm font-semibold text-white transition hover:bg-accent-strong"
            >
              Submit application
            </button>
          </div>
        </form>
      </section>
    </PageFrame>
  );
}

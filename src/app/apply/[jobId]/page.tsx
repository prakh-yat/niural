import Link from "next/link";
import { notFound } from "next/navigation";

import { PageFrame } from "@/components/shell/page-frame";
import { StatusPill } from "@/components/ui/status-pill";
import { getJobById, listJobs } from "@/lib/server/data";

function formatJobStatus(status: "open" | "paused" | "closed") {
  return status.charAt(0).toUpperCase() + status.slice(1);
}

export default async function ApplyPage({
  params,
  searchParams,
}: {
  params: Promise<{ jobId: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const { jobId } = await params;
  const { error } = await searchParams;
  const [job, jobs] = await Promise.all([getJobById(jobId), listJobs()]);

  if (!job) {
    notFound();
  }

  const selectableJobs = jobs.filter((entry) => entry.status === "open");
  const hasOpenRoles = selectableJobs.length > 0;
  const selectedJobId =
    job.status === "open" ? job.id : hasOpenRoles ? selectableJobs[0].id : "";
  const statusMessage =
    job.status === "paused"
      ? "This role is temporarily paused. You can choose another open role below."
      : "This role is closed. You can still apply to another open role from this page.";

  return (
    <PageFrame>
      <section className="grid gap-6 lg:grid-cols-[0.95fr_1.05fr]">
        <div className="flex flex-col gap-6 rounded-lg border border-gray-200 bg-white p-5">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="dense-label">Applying for</p>
              <h1 className="mt-2 text-2xl font-semibold text-gray-900">
                {job.title}
              </h1>
            </div>
            <div className="flex flex-wrap items-center justify-end gap-2">
              <StatusPill label={formatJobStatus(job.status)} tone={job.status} />
              <StatusPill label={job.remoteLabel} tone="open" />
            </div>
          </div>
          <p className="text-sm leading-6 text-gray-500">{job.overview}</p>
          {job.status !== "open" ? (
            <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
              {statusMessage}
            </div>
          ) : null}
          <div className="grid gap-3 text-sm text-gray-500">
            <div className="rounded-lg border border-gray-200 bg-white px-4 py-3">Accepted formats: PDF, DOCX</div>
            <div className="rounded-lg border border-gray-200 bg-white px-4 py-3">You will receive a confirmation email after submission</div>
          </div>
        </div>

        {hasOpenRoles ? (
          <form
            action="/api/applications"
            method="post"
            encType="multipart/form-data"
            className="rounded-lg border border-gray-200 bg-white p-6 md:p-8"
          >
            {error ? (
              <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {error}
              </div>
            ) : null}
            <div className="flex flex-col gap-2">
              <p className="dense-label">Candidate application</p>
              <h2 className="text-xl font-semibold text-gray-900">Apply</h2>
              <p className="text-sm leading-6 text-gray-500">
                Fill out your details and upload your resume to get started.
              </p>
            </div>

            <div className="mt-8 grid gap-4 md:grid-cols-2">
              <label className="flex flex-col gap-2 text-sm font-medium text-gray-900">
                Full name
                <input
                  type="text"
                  name="fullName"
                  required
                  className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm outline-none transition focus:border-indigo-600"
                />
              </label>
              <label className="flex flex-col gap-2 text-sm font-medium text-gray-900">
                Email
                <input
                  type="email"
                  name="email"
                  required
                  className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm outline-none transition focus:border-indigo-600"
                />
              </label>
              <label className="flex flex-col gap-2 text-sm font-medium text-gray-900">
                LinkedIn URL
                <input
                  type="url"
                  name="linkedInUrl"
                  required
                  className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm outline-none transition focus:border-indigo-600"
                />
              </label>
              <label className="flex flex-col gap-2 text-sm font-medium text-gray-900">
                Portfolio / GitHub
                <input
                  type="url"
                  name="portfolioUrl"
                  className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm outline-none transition focus:border-indigo-600"
                />
              </label>
            </div>

            <div className="mt-4 grid gap-4">
              <label className="flex flex-col gap-2 text-sm font-medium text-gray-900">
                Role selection
                <select
                  name="jobId"
                  defaultValue={selectedJobId}
                  className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm outline-none transition focus:border-indigo-600"
                >
                  {selectableJobs.map((option) => (
                    <option key={option.id} value={option.id}>
                      {option.title}
                    </option>
                  ))}
                </select>
              </label>
              <label className="flex flex-col gap-2 text-sm font-medium text-gray-900">
                Resume upload
                <input
                  type="file"
                  name="resume"
                  accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                  required
                  className="rounded-lg border border-dashed border-gray-400 bg-white px-3 py-3 text-sm text-gray-500"
                />
              </label>
            </div>

            <div className="mt-8 flex items-center justify-between gap-4 border-t border-gray-200 pt-6">
              <p className="max-w-md text-sm leading-6 text-gray-500">
                Your application will be reviewed by our AI screening system.
              </p>
              <button
                type="submit"
                className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
              >
                Submit application
              </button>
            </div>
          </form>
        ) : (
          <div className="rounded-lg border border-gray-200 bg-white p-6 md:p-8">
            <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-4 text-sm text-amber-800">
              There are no open roles available right now. Please check back later or browse the
              live job board for updates.
            </div>
            <div className="mt-6">
              <Link
                href="/careers"
                className="inline-flex items-center justify-center rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
              >
                Browse job board
              </Link>
            </div>
          </div>
        )}
      </section>
    </PageFrame>
  );
}

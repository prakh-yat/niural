import Link from "next/link";
import { cookies } from "next/headers";
import { notFound } from "next/navigation";
import { BriefcaseBusiness, CheckCircle2, DollarSign, MapPin } from "lucide-react";

import { FlashBanner } from "@/components/ui/flash-banner";
import { StatusPill } from "@/components/ui/status-pill";
import { getJobBySlug } from "@/lib/server/data";
import { FLASH_COOKIE_NAMES } from "@/lib/server/flash";

function formatJobStatus(status: "open" | "paused" | "closed") {
  return status.charAt(0).toUpperCase() + status.slice(1);
}

export default async function JobDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const cookieStore = await cookies();
  const flashValue = cookieStore.get(FLASH_COOKIE_NAMES.jobApplication)?.value;
  const flash = flashValue
    ? (() => {
        try {
          return JSON.parse(decodeURIComponent(flashValue)) as {
            tone: "success" | "error";
            message: string;
          };
        } catch {
          return null;
        }
      })()
    : null;
  const job = await getJobBySlug(slug);

  if (!job) {
    notFound();
  }

  const roleUnavailable = job.status !== "open";
  const statusTitle =
    job.status === "paused" ? "Applications are paused for this role" : "This role is closed";
  const statusCopy =
    job.status === "paused"
      ? "The role is still listed, but intake is temporarily paused. Check back later or apply to another open job."
      : "This posting is no longer accepting applications. You can still review the JD and browse other open roles.";

  return (
    <div className="min-h-screen bg-[#fcfcfd]">
      {flash ? (
        <div className="border-b border-gray-100 px-4 py-3 sm:px-6">
          <div className="mx-auto max-w-6xl">
            <FlashBanner cookieName={FLASH_COOKIE_NAMES.jobApplication} flash={flash} />
          </div>
        </div>
      ) : null}

      <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
        <Link href="/careers" className="text-sm font-medium text-violet-600 hover:text-violet-700">
          &larr; Back to jobs
        </Link>

        <div className="mt-6 grid gap-8 lg:grid-cols-[1.15fr_0.85fr]">
          <div className="space-y-8">
            <section className="rounded-[2rem] border border-gray-200 bg-white p-8">
              <div className="flex flex-wrap items-center gap-3">
                <p className="text-sm font-medium text-gray-400">{job.team}</p>
                <StatusPill label={formatJobStatus(job.status)} tone={job.status} />
              </div>
              <h1 className="mt-3 text-4xl font-bold tracking-[-0.05em] text-gray-950">
                {job.title}
              </h1>
              <div className="mt-5 flex flex-wrap gap-3 text-sm text-gray-500">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-gray-50 px-3 py-1.5">
                  <MapPin className="h-4 w-4" />
                  {job.location}
                </span>
                <span className="inline-flex items-center gap-1.5 rounded-full bg-gray-50 px-3 py-1.5">
                  <BriefcaseBusiness className="h-4 w-4" />
                  {job.experienceLevel} · {job.remoteLabel}
                </span>
                <span className="inline-flex items-center gap-1.5 rounded-full bg-gray-50 px-3 py-1.5">
                  <DollarSign className="h-4 w-4" />
                  {job.compensationBand}
                </span>
              </div>
              <p className="mt-6 text-base leading-8 text-gray-600">{job.overview}</p>
            </section>

            <section className="rounded-[2rem] border border-gray-200 bg-white p-8">
              <h2 className="text-lg font-semibold text-gray-950">What you will do</h2>
              <div className="mt-4 grid gap-3">
                {job.responsibilities.map((item) => (
                  <div key={item} className="flex gap-3 rounded-xl bg-gray-50 px-4 py-3 text-sm leading-7 text-gray-600">
                    <CheckCircle2 className="mt-1 h-4 w-4 shrink-0 text-violet-500" />
                    <span>{item}</span>
                  </div>
                ))}
              </div>
            </section>

            <section className="rounded-[2rem] border border-gray-200 bg-white p-8">
              <h2 className="text-lg font-semibold text-gray-950">What we are looking for</h2>
              <div className="mt-4 grid gap-3">
                {job.requirements.map((item) => (
                  <div key={item} className="flex gap-3 rounded-xl bg-gray-50 px-4 py-3 text-sm leading-7 text-gray-600">
                    <CheckCircle2 className="mt-1 h-4 w-4 shrink-0 text-emerald-500" />
                    <span>{item}</span>
                  </div>
                ))}
              </div>
            </section>

            <section className="rounded-[2rem] border border-gray-200 bg-white p-8">
              <h2 className="text-lg font-semibold text-gray-950">Why this role stands out</h2>
              <div className="mt-4 flex flex-wrap gap-2">
                {job.differentiators.map((item) => (
                  <span
                    key={item}
                    className="rounded-full bg-violet-50 px-3 py-1.5 text-sm font-medium text-violet-700"
                  >
                    {item}
                  </span>
                ))}
              </div>
              {job.aiLeverageSummary ? (
                <div className="mt-6 rounded-xl border border-gray-200 bg-gray-50 px-4 py-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-gray-400">
                    AI in the role
                  </p>
                  <p className="mt-2 text-sm leading-7 text-gray-600">{job.aiLeverageSummary}</p>
                </div>
              ) : null}
            </section>
          </div>

          <aside className="lg:sticky lg:top-24 lg:self-start">
            <section className="rounded-[2rem] border border-gray-200 bg-white p-8 shadow-[0_18px_44px_rgba(15,23,42,0.06)]">
              {roleUnavailable ? (
                <>
                  <p className="text-xs font-semibold uppercase tracking-[0.24em] text-amber-600">
                    {job.status === "paused" ? "Temporarily paused" : "Closed to applications"}
                  </p>
                  <h2 className="mt-3 text-2xl font-semibold tracking-[-0.04em] text-gray-950">
                    {statusTitle}
                  </h2>
                  <p className="mt-3 text-sm leading-6 text-gray-500">{statusCopy}</p>
                  <div className="mt-6 space-y-3">
                    <Link
                      href="/careers"
                      className="inline-flex w-full items-center justify-center rounded-xl bg-[linear-gradient(135deg,#7c3aed,#5b21b6)] px-6 py-3 text-sm font-semibold text-white transition hover:opacity-95"
                    >
                      Browse other roles
                    </Link>
                    <Link
                      href={`/apply/${job.id}`}
                      className="inline-flex w-full items-center justify-center rounded-xl border border-gray-200 px-6 py-3 text-sm font-semibold text-gray-700 transition hover:bg-gray-50"
                    >
                      Open the application chooser
                    </Link>
                  </div>
                </>
              ) : (
                <>
                  <p className="text-xs font-semibold uppercase tracking-[0.24em] text-violet-500">
                    Apply now
                  </p>
                  <h2 className="mt-3 text-2xl font-semibold tracking-[-0.04em] text-gray-950">
                    Apply for {job.title}
                  </h2>
                  <p className="mt-3 text-sm leading-6 text-gray-500">
                    Upload your resume and the application will be screened against this exact role.
                  </p>

                  <form
                    action="/api/applications"
                    method="post"
                    encType="multipart/form-data"
                    className="mt-6 space-y-4"
                  >
                    <input type="hidden" name="jobId" value={job.id} />
                    <input type="hidden" name="jobSlug" value={job.slug} />

                    <label className="grid gap-1.5 text-sm font-medium text-gray-700">
                      Full name *
                      <input
                        type="text"
                        name="fullName"
                        required
                        placeholder="Jane Doe"
                        className="rounded-xl border border-gray-200 bg-white px-3 py-3 text-sm text-gray-900 outline-none transition focus:border-violet-400 focus:ring-4 focus:ring-violet-500/10"
                      />
                    </label>

                    <label className="grid gap-1.5 text-sm font-medium text-gray-700">
                      Email *
                      <input
                        type="email"
                        name="email"
                        required
                        placeholder="jane@example.com"
                        className="rounded-xl border border-gray-200 bg-white px-3 py-3 text-sm text-gray-900 outline-none transition focus:border-violet-400 focus:ring-4 focus:ring-violet-500/10"
                      />
                    </label>

                    <label className="grid gap-1.5 text-sm font-medium text-gray-700">
                      LinkedIn URL
                      <input
                        type="url"
                        name="linkedInUrl"
                        placeholder="https://linkedin.com/in/..."
                        className="rounded-xl border border-gray-200 bg-white px-3 py-3 text-sm text-gray-900 outline-none transition focus:border-violet-400 focus:ring-4 focus:ring-violet-500/10"
                      />
                    </label>

                    <label className="grid gap-1.5 text-sm font-medium text-gray-700">
                      Portfolio / GitHub
                      <input
                        type="url"
                        name="portfolioUrl"
                        placeholder="https://github.com/..."
                        className="rounded-xl border border-gray-200 bg-white px-3 py-3 text-sm text-gray-900 outline-none transition focus:border-violet-400 focus:ring-4 focus:ring-violet-500/10"
                      />
                    </label>

                    <label className="grid gap-1.5 text-sm font-medium text-gray-700">
                      Resume * (PDF or DOCX, max 8MB)
                      <input
                        type="file"
                        name="resume"
                        accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                        required
                        className="rounded-xl border border-dashed border-gray-300 bg-white px-3 py-3 text-sm text-gray-500 file:mr-3 file:rounded-md file:border-0 file:bg-violet-50 file:px-3 file:py-1 file:text-xs file:font-medium file:text-violet-700"
                      />
                    </label>

                    <button
                      type="submit"
                      className="w-full rounded-xl bg-[linear-gradient(135deg,#7c3aed,#5b21b6)] px-6 py-3 text-sm font-semibold text-white transition hover:opacity-95"
                    >
                      Submit application
                    </button>
                  </form>
                </>
              )}
            </section>
          </aside>
        </div>
      </div>
    </div>
  );
}

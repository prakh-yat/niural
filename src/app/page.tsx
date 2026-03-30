import Link from "next/link";
import { ArrowRight, BriefcaseBusiness, MapPin, Wallet } from "lucide-react";

import { PageFrame } from "@/components/shell/page-frame";
import { listJobs } from "@/lib/server/data";
import { initials } from "@/lib/utils";

export default async function HomePage() {
  const jobs = (await listJobs()).slice(0, 6);

  return (
    <PageFrame className="gap-16 px-4 pb-20 pt-10 sm:px-6">
      <section className="mx-auto flex max-w-5xl flex-col items-center text-center">
        <p className="text-sm uppercase tracking-[0.28em] text-gray-500">Stop guessing.</p>
        <h1 className="mt-5 max-w-4xl text-5xl font-bold tracking-[-0.06em] text-gray-950 sm:text-6xl">
          Let AI Handle Your{" "}
          <span className="bg-[linear-gradient(135deg,#7c3aed,#5b21b6)] bg-clip-text text-transparent">
            Career Direction
          </span>
        </h1>
        <p className="mt-6 max-w-3xl text-lg leading-8 text-gray-600">
          Niural helps candidates find better-fit roles, build stronger application material,
          and move through a modern hiring workflow without losing context at every step.
        </p>
        <div className="mt-8 flex flex-col gap-3 sm:flex-row">
          <Link
            href="/careers"
            className="inline-flex items-center justify-center rounded-xl border border-gray-200 px-6 py-3 text-sm font-semibold text-gray-700 transition hover:bg-gray-50"
          >
            View More Jobs
          </Link>
          <Link
            href="/auth/sign-in"
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-[linear-gradient(135deg,#7c3aed,#5b21b6)] px-6 py-3 text-sm font-semibold text-white transition hover:opacity-95"
          >
            Qualify Automatically
            <ArrowRight className="h-4 w-4 text-white" />
          </Link>
        </div>
      </section>

      <section id="jobs" className="space-y-6">
        <div className="text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-violet-500">
            Featured jobs
          </p>
          <h2 className="mt-3 text-3xl font-semibold tracking-[-0.04em] text-gray-950">
            Real roles, clean application flow
          </h2>
          <p className="mt-3 text-sm leading-7 text-gray-500">
            Browse active openings, open the full job page, and apply directly on the role detail.
          </p>
        </div>

        <div className="grid gap-5 lg:grid-cols-3">
          {jobs.map((job) => (
            <article
              key={job.id}
              className="rounded-[1.75rem] border border-gray-200 bg-white p-6 shadow-[0_12px_36px_rgba(15,23,42,0.05)] transition hover:-translate-y-0.5 hover:shadow-[0_20px_44px_rgba(15,23,42,0.08)]"
            >
              <div className="flex items-start gap-4">
                <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-violet-50 text-lg font-semibold text-violet-700">
                  {initials(job.team)}
                </div>
                <div className="min-w-0 flex-1 border-l border-gray-200 pl-4">
                  <h3 className="text-2xl font-semibold tracking-[-0.04em] text-gray-950">
                    {job.title}
                  </h3>
                  <p className="mt-2 text-lg text-gray-800">{job.team}</p>
                  <p className="mt-2 text-base text-gray-500">{job.location}</p>
                  <div className="mt-4 flex flex-wrap gap-2">
                    <span className="rounded-full bg-violet-50 px-3 py-1 text-sm font-medium text-violet-700">
                      {job.team}
                    </span>
                    <span className="rounded-full bg-violet-50 px-3 py-1 text-sm font-medium text-violet-700">
                      {job.remoteLabel}
                    </span>
                  </div>
                </div>
              </div>

              <div className="mt-6 border-t border-gray-200 pt-4">
                <div className="flex flex-wrap items-center gap-3 text-sm text-gray-600">
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-gray-50 px-3 py-1">
                    <BriefcaseBusiness className="h-3.5 w-3.5" />
                    {job.experienceLevel}
                  </span>
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-gray-50 px-3 py-1">
                    <Wallet className="h-3.5 w-3.5" />
                    {job.compensationBand}
                  </span>
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-gray-50 px-3 py-1">
                    <MapPin className="h-3.5 w-3.5" />
                    {job.location}
                  </span>
                </div>
                <Link
                  href={`/jobs/${job.slug}`}
                  className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-violet-700 transition hover:text-violet-900"
                >
                  Open job page
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
            </article>
          ))}
        </div>

        <div className="flex flex-col gap-3 sm:flex-row">
          <Link
            href="/careers"
            className="inline-flex flex-1 items-center justify-center rounded-xl border border-gray-200 px-6 py-3 text-sm font-semibold text-gray-700 transition hover:bg-gray-50"
          >
            View More Jobs
          </Link>
          <Link
            href="/auth/sign-in"
            className="inline-flex flex-1 items-center justify-center rounded-xl bg-[linear-gradient(135deg,#7c3aed,#5b21b6)] px-6 py-3 text-sm font-semibold text-white transition hover:opacity-95"
          >
            Qualify Automatically
          </Link>
        </div>
      </section>
    </PageFrame>
  );
}

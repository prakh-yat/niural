import Link from "next/link";
import { notFound } from "next/navigation";

import { PageFrame } from "@/components/shell/page-frame";
import { Panel } from "@/components/ui/panel";
import { StatusPill } from "@/components/ui/status-pill";
import { getJobBySlug } from "@/lib/server/data";

export default async function CareerDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const job = await getJobBySlug(slug);

  if (!job) {
    notFound();
  }

  return (
    <PageFrame>
      <section className="grid gap-6 lg:grid-cols-[1.08fr_0.92fr]">
        <div className="glass-panel rounded-[2rem] px-6 py-7 md:px-10 md:py-10">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="dense-label">{job.team}</p>
              <h1 className="mt-2 font-display text-[2.7rem] leading-[0.94] tracking-[-0.06em] text-ink md:text-[4rem]">
                {job.title}
              </h1>
            </div>
            <StatusPill label={job.status} tone={job.status} className="capitalize" />
          </div>
          <p className="mt-6 max-w-3xl text-lg leading-8 text-ink-soft">{job.overview}</p>

          <div className="mt-8 grid gap-6 md:grid-cols-2">
            <div>
              <p className="dense-label">Responsibilities</p>
              <ul className="mt-4 space-y-3 text-sm leading-7 text-ink-soft">
                {job.responsibilities.map((item) => (
                  <li key={item}>• {item}</li>
                ))}
              </ul>
            </div>
            <div>
              <p className="dense-label">Requirements</p>
              <ul className="mt-4 space-y-3 text-sm leading-7 text-ink-soft">
                {job.requirements.map((item) => (
                  <li key={item}>• {item}</li>
                ))}
              </ul>
            </div>
          </div>
        </div>

        <Panel className="flex flex-col gap-6">
          <div>
            <p className="dense-label">Role context</p>
            <div className="mt-4 grid gap-4 text-sm text-ink-soft">
              <div>
                <span className="font-semibold text-ink">Location:</span> {job.location}
              </div>
              <div>
                <span className="font-semibold text-ink">Remote model:</span> {job.remoteLabel}
              </div>
              <div>
                <span className="font-semibold text-ink">Experience:</span> {job.experienceLevel}
              </div>
              <div>
                <span className="font-semibold text-ink">Comp:</span> {job.compensationBand}
              </div>
            </div>
          </div>
          <div>
            <p className="dense-label">Why this role exists</p>
            <p className="mt-3 text-sm leading-8 text-ink-soft">{job.aiLeverageSummary}</p>
          </div>
          <div>
            <p className="dense-label">Differentiators</p>
            <ul className="mt-3 space-y-3 text-sm leading-7 text-ink-soft">
              {job.differentiators.map((item) => (
                <li key={item}>• {item}</li>
              ))}
            </ul>
          </div>
          <div className="flex flex-col gap-3 border-t border-line pt-5">
            <Link
              href={`/apply/${job.id}`}
              className="inline-flex items-center justify-center rounded-full bg-accent px-5 py-3 text-sm font-semibold text-white"
            >
              Apply for this role
            </Link>
            <Link
              href="/careers"
              className="inline-flex items-center justify-center rounded-full border border-line px-5 py-3 text-sm font-semibold text-ink"
            >
              Back to careers
            </Link>
          </div>
        </Panel>
      </section>
    </PageFrame>
  );
}

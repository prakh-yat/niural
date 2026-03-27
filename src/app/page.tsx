import Link from "next/link";
import {
  ArrowRight,
  Bot,
  CalendarClock,
  FileSignature,
  MailCheck,
  MessageSquare,
  SearchCheck,
} from "lucide-react";

import { PageFrame } from "@/components/shell/page-frame";
import { Panel } from "@/components/ui/panel";
import { SectionHeading } from "@/components/ui/section-heading";
import { StatusPill } from "@/components/ui/status-pill";
import { listCandidates, listJobs } from "@/lib/server/data";
import { formatCurrency, formatShortDate } from "@/lib/utils";

export default async function HomePage() {
  const [jobs, candidates] = await Promise.all([listJobs(), listCandidates()]);
  const featuredCandidate = candidates[0];

  return (
    <PageFrame>
      <section className="grid gap-8 lg:grid-cols-[1.1fr_0.9fr]">
        <div className="glass-panel flex flex-col gap-7 rounded-[2rem] px-6 py-7 md:px-10 md:py-10">
          <span className="eyebrow">AI-native candidate onboarding</span>
          <div className="flex flex-col gap-5">
            <h1 className="section-title max-w-4xl text-ink">
              From first application to first Slack message, in one operating system.
            </h1>
            <p className="max-w-2xl text-lg leading-8 text-ink-soft">
              Niural TalentOS is a recruiter-grade workflow product for screening, enrichment,
              scheduling, interviews, offers, and onboarding. It is designed to move fast
              without looking like a generic dashboard prototype.
            </p>
          </div>
          <div className="flex flex-col gap-3 md:flex-row">
            <Link
              href="/careers"
              className="inline-flex items-center justify-center gap-2 rounded-full bg-accent px-5 py-3 text-sm font-semibold text-white transition hover:bg-accent-strong"
            >
              Explore careers
              <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              href="/admin"
              className="inline-flex items-center justify-center rounded-full border border-line bg-white px-5 py-3 text-sm font-semibold text-ink transition hover:border-line-strong"
            >
              Open admin workspace
            </Link>
          </div>
          <div className="grid gap-4 border-t border-line pt-5 sm:grid-cols-3">
            <div>
              <p className="dense-label">Live phases</p>
              <p className="mt-2 font-display text-4xl tracking-[-0.06em] text-ink">6</p>
            </div>
            <div>
              <p className="dense-label">Default shortlist</p>
              <p className="mt-2 font-display text-4xl tracking-[-0.06em] text-ink">75</p>
            </div>
            <div>
              <p className="dense-label">Primary UI mode</p>
              <p className="mt-2 text-sm font-semibold text-ink-soft">Table-first operational UX</p>
            </div>
          </div>
        </div>

        <Panel className="flex flex-col gap-5 bg-gradient-to-br from-white to-panel-tint">
          <div className="flex items-center justify-between">
            <div>
              <p className="dense-label">Pipeline preview</p>
              <h2 className="mt-2 font-display text-3xl tracking-[-0.05em] text-ink">
                Candidate snapshot
              </h2>
            </div>
            <StatusPill label={featuredCandidate.stage.replaceAll("_", " ")} tone="scheduled" />
          </div>
          <div className="rounded-[1.5rem] border border-line bg-white p-5">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-lg font-semibold text-ink">{featuredCandidate.fullName}</p>
                <p className="text-sm text-ink-soft">{featuredCandidate.jobTitle}</p>
              </div>
              <div className="text-right">
                <p className="dense-label">AI fit</p>
                <p className="mt-2 font-display text-4xl tracking-[-0.05em] text-accent">
                  {featuredCandidate.score}
                </p>
              </div>
            </div>
            <p className="mt-4 text-sm leading-7 text-ink-soft">{featuredCandidate.fitSummary}</p>
            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              <div className="rounded-2xl bg-panel-strong p-4">
                <p className="dense-label">Interview</p>
                <p className="mt-2 text-sm font-semibold text-ink">
                  {featuredCandidate.interview.status}
                </p>
                <p className="mt-1 text-sm text-ink-soft">
                  {featuredCandidate.interview.confirmedAt
                    ? formatShortDate(featuredCandidate.interview.confirmedAt)
                    : "Scheduling in progress"}
                </p>
              </div>
              <div className="rounded-2xl bg-panel-strong p-4">
                <p className="dense-label">Offer</p>
                <p className="mt-2 text-sm font-semibold text-ink">
                  {featuredCandidate.offer?.status ?? "Drafting"}
                </p>
                <p className="mt-1 text-sm text-ink-soft">
                  {featuredCandidate.offer
                    ? formatCurrency(featuredCandidate.offer.baseSalary)
                    : "Comp pending"}
                </p>
              </div>
            </div>
          </div>
          <Link
            href={`/admin/candidates/${featuredCandidate.id}`}
            className="inline-flex items-center gap-2 text-sm font-semibold text-accent-strong"
          >
            Inspect candidate detail
            <ArrowRight className="h-4 w-4" />
          </Link>
        </Panel>
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        {jobs.map((job) => (
          <Panel key={job.id} className="flex flex-col gap-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="dense-label">{job.team}</p>
                <h3 className="mt-2 font-display text-[1.8rem] leading-none tracking-[-0.05em] text-ink">
                  {job.title}
                </h3>
              </div>
              <StatusPill label={job.remoteLabel} tone="open" />
            </div>
            <p className="text-sm leading-7 text-ink-soft">{job.overview}</p>
            <div className="flex items-center justify-between border-t border-line pt-4 text-sm text-ink-soft">
              <span>{job.location}</span>
              <span>{job.compensationBand}</span>
            </div>
            <Link href={`/careers/${job.slug}`} className="text-sm font-semibold text-accent-strong">
              View role
            </Link>
          </Panel>
        ))}
      </section>

      <section className="grid gap-5 lg:grid-cols-[0.9fr_1.1fr]">
        <SectionHeading
          eyebrow="Workflow phases"
          title="Every phase has a clear human owner and a clear AI job."
          body="The product is designed around explicit transitions, auditability, and failure paths, not one-shot demos."
        />
        <div className="grid gap-4 sm:grid-cols-2">
          {[
            {
              icon: SearchCheck,
              title: "Resume screening",
              body: "Structured extraction, fit scoring, and gap analysis against the applied role.",
            },
            {
              icon: CalendarClock,
              title: "Scheduling holds",
              body: "Tentative slot holds prevent conflicts while candidates decide.",
            },
            {
              icon: MailCheck,
              title: "Triggered comms",
              body: "Confirmation emails, nudges, and scheduling messages run from one state model.",
            },
            {
              icon: Bot,
              title: "Research enrichment",
              body: "Submitted links, extracted URLs, and search results become interviewer briefs.",
            },
            {
              icon: FileSignature,
              title: "Offer workflow",
              body: "A hiring-manager wizard drafts, reviews, and sends a DocuSign-ready letter.",
            },
            {
              icon: MessageSquare,
              title: "Onboarding handoff",
              body: "Signed offers trigger Slack invite, welcome messaging, and HR confirmation.",
            },
          ].map((item) => {
            const Icon = item.icon;
            return (
              <Panel key={item.title} className="flex gap-4">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-accent-soft text-accent">
                  <Icon className="h-5 w-5" />
                </div>
                <div className="flex flex-col gap-2">
                  <h3 className="text-base font-semibold text-ink">{item.title}</h3>
                  <p className="text-sm leading-7 text-ink-soft">{item.body}</p>
                </div>
              </Panel>
            );
          })}
        </div>
      </section>
    </PageFrame>
  );
}

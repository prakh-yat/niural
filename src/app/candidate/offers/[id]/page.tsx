import Link from "next/link";
import { notFound } from "next/navigation";

import { PageFrame } from "@/components/shell/page-frame";
import { Panel } from "@/components/ui/panel";
import { StatusPill } from "@/components/ui/status-pill";
import { getCandidateByOfferId } from "@/lib/server/data";
import { formatCurrency, formatShortDate } from "@/lib/utils";

export default async function CandidateOfferPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const candidate = await getCandidateByOfferId(id);

  if (!candidate?.offer) {
    notFound();
  }

  return (
    <PageFrame>
      <section className="grid gap-6 lg:grid-cols-[0.86fr_1.14fr]">
        <Panel className="flex flex-col gap-6">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="dense-label">Offer package</p>
              <h1 className="mt-2 font-display text-[2.4rem] tracking-[-0.05em] text-ink">
                {candidate.jobTitle}
              </h1>
            </div>
            <StatusPill label={candidate.offer.status} tone={candidate.offer.status} />
          </div>
          <div className="grid gap-4">
            <div className="rounded-[1.4rem] bg-panel-strong p-4">
              <p className="dense-label">Base salary</p>
              <p className="mt-2 text-lg font-semibold text-ink">
                {formatCurrency(candidate.offer.baseSalary)}
              </p>
            </div>
            <div className="rounded-[1.4rem] bg-panel-strong p-4">
              <p className="dense-label">Start date</p>
              <p className="mt-2 text-lg font-semibold text-ink">
                {formatShortDate(candidate.offer.startDate)}
              </p>
            </div>
          </div>
          <p className="text-sm leading-8 text-ink-soft">{candidate.offer.managerGreeting}</p>
          <div className="rounded-[1.4rem] border border-line bg-white p-4">
            <p className="dense-label">Custom terms</p>
            <p className="mt-2 text-sm leading-7 text-ink-soft">{candidate.offer.customTerms}</p>
          </div>
        </Panel>

        <Panel className="flex flex-col gap-5">
          <div>
            <p className="dense-label">Signature handoff</p>
            <h2 className="mt-2 font-display text-[2rem] tracking-[-0.05em] text-ink">
              Review and sign with DocuSign
            </h2>
          </div>
          <div className="rounded-[1.5rem] border border-line bg-panel p-5">
            <p className="text-sm leading-8 text-ink-soft">
              This portal keeps the offer context visible, but the live signature flow is routed through DocuSign. Once the envelope is signed, Slack onboarding is triggered automatically.
            </p>
            <div className="mt-5 grid gap-3 text-sm text-ink-soft sm:grid-cols-2">
              <div className="rounded-2xl bg-white px-4 py-3">
                Bonus: <span className="font-semibold text-ink">{candidate.offer.bonus}</span>
              </div>
              <div className="rounded-2xl bg-white px-4 py-3">
                Equity: <span className="font-semibold text-ink">{candidate.offer.equity}</span>
              </div>
            </div>
          </div>
          <form action="/api/webhooks/docusign" method="post" className="flex flex-col gap-3">
            <input type="hidden" name="offerId" value={candidate.offer.id} />
            <input type="hidden" name="candidateEmail" value={candidate.email} />
            <input type="hidden" name="candidateName" value={candidate.fullName} />
            <button
              type="submit"
              className="rounded-full bg-accent px-5 py-3 text-sm font-semibold text-white"
            >
              Send DocuSign envelope
            </button>
          </form>
          <Link
            href="/candidate"
            className="inline-flex items-center justify-center rounded-full border border-line px-5 py-3 text-sm font-semibold text-ink"
          >
            Back to candidate portal
          </Link>
        </Panel>
      </section>
    </PageFrame>
  );
}

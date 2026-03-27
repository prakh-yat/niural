import { notFound } from "next/navigation";

import { PageFrame } from "@/components/shell/page-frame";
import { Panel } from "@/components/ui/panel";
import { StatusPill } from "@/components/ui/status-pill";
import { getCandidateByOfferId } from "@/lib/server/data";
import { formatCurrency, formatShortDate } from "@/lib/utils";

export default async function AdminOfferPage({
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
      <section className="grid gap-6 lg:grid-cols-[0.76fr_1.24fr]">
        <Panel className="flex flex-col gap-5">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="dense-label">Offer workspace</p>
              <h1 className="mt-2 font-display text-[2.4rem] tracking-[-0.05em] text-ink">
                {candidate.fullName}
              </h1>
            </div>
            <StatusPill label={candidate.offer.status} tone={candidate.offer.status} />
          </div>
          <div className="grid gap-4">
            <div className="rounded-[1.4rem] bg-panel-strong p-4">
              <p className="dense-label">Role</p>
              <p className="mt-2 text-base font-semibold text-ink">{candidate.jobTitle}</p>
            </div>
            <div className="rounded-[1.4rem] bg-panel-strong p-4">
              <p className="dense-label">Compensation</p>
              <p className="mt-2 text-base font-semibold text-ink">
                {formatCurrency(candidate.offer.baseSalary)}
              </p>
              <p className="mt-1 text-sm text-ink-soft">
                {candidate.offer.bonus} · {candidate.offer.equity}
              </p>
            </div>
          </div>
        </Panel>

        <Panel className="flex flex-col gap-5">
          <div>
            <p className="dense-label">Offer generation wizard</p>
            <h2 className="mt-2 font-display text-[2rem] tracking-[-0.05em] text-ink">
              Review, edit, and send
            </h2>
          </div>
          <form action="/api/webhooks/docusign" method="post" className="grid gap-4">
            <input type="hidden" name="offerId" value={candidate.offer.id} />
            <input type="hidden" name="candidateEmail" value={candidate.email} />
            <input type="hidden" name="candidateName" value={candidate.fullName} />
            <label className="flex flex-col gap-2 text-sm font-medium text-ink">
              Job title
              <input
                name="jobTitle"
                defaultValue={candidate.jobTitle}
                className="rounded-[1.4rem] border border-line bg-panel px-4 py-3"
              />
            </label>
            <div className="grid gap-4 md:grid-cols-2">
              <label className="flex flex-col gap-2 text-sm font-medium text-ink">
                Start date
                <input
                  name="startDate"
                  defaultValue={candidate.offer.startDate.slice(0, 10)}
                  type="date"
                  className="rounded-[1.4rem] border border-line bg-panel px-4 py-3"
                />
              </label>
              <label className="flex flex-col gap-2 text-sm font-medium text-ink">
                Base salary
                <input
                  name="baseSalary"
                  defaultValue={candidate.offer.baseSalary}
                  type="number"
                  className="rounded-[1.4rem] border border-line bg-panel px-4 py-3"
                />
              </label>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <label className="flex flex-col gap-2 text-sm font-medium text-ink">
                Bonus
                <input
                  name="bonus"
                  defaultValue={candidate.offer.bonus}
                  className="rounded-[1.4rem] border border-line bg-panel px-4 py-3"
                />
              </label>
              <label className="flex flex-col gap-2 text-sm font-medium text-ink">
                Equity
                <input
                  name="equity"
                  defaultValue={candidate.offer.equity}
                  className="rounded-[1.4rem] border border-line bg-panel px-4 py-3"
                />
              </label>
            </div>
            <label className="flex flex-col gap-2 text-sm font-medium text-ink">
              Manager
              <input
                name="managerName"
                defaultValue={candidate.offer.managerName}
                className="rounded-[1.4rem] border border-line bg-panel px-4 py-3"
              />
            </label>
            <label className="flex flex-col gap-2 text-sm font-medium text-ink">
              Custom terms
              <textarea
                name="customTerms"
                defaultValue={candidate.offer.customTerms}
                rows={5}
                className="rounded-[1.4rem] border border-line bg-panel px-4 py-3"
              />
            </label>
            <div className="flex items-center justify-between gap-4 border-t border-line pt-4">
              <p className="text-sm leading-7 text-ink-soft">
                Once sent, DocuSign webhooks update the offer state and unlock Slack onboarding.
              </p>
              <button
                type="submit"
                className="rounded-full bg-accent px-5 py-3 text-sm font-semibold text-white"
              >
                Send for signature
              </button>
            </div>
          </form>
          <div className="rounded-[1.5rem] border border-line bg-panel p-5">
            <p className="dense-label">Manager greeting</p>
            <p className="mt-2 text-sm leading-8 text-ink-soft">{candidate.offer.managerGreeting}</p>
            <p className="mt-3 text-sm font-semibold text-ink">
              Start date: {formatShortDate(candidate.offer.startDate)}
            </p>
          </div>
        </Panel>
      </section>
    </PageFrame>
  );
}

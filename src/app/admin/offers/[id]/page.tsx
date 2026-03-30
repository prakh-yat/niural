import { notFound } from "next/navigation";

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
    <section className="grid gap-6 lg:grid-cols-[1fr_1.3fr]">
      <Panel className="flex flex-col gap-5">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="dense-label">Offer workspace</p>
            <h1 className="mt-2 text-2xl font-semibold text-gray-900">
              {candidate.fullName}
            </h1>
          </div>
          <StatusPill label={candidate.offer.status} tone={candidate.offer.status} />
        </div>
        <div className="grid gap-4">
          <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
            <p className="dense-label">Role</p>
            <p className="mt-2 text-sm font-semibold text-gray-900">{candidate.jobTitle}</p>
          </div>
          <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
            <p className="dense-label">Compensation</p>
            <p className="mt-2 text-sm font-semibold text-gray-900">
              {formatCurrency(candidate.offer.baseSalary)}
            </p>
            <p className="mt-1 text-sm text-gray-500">
              {candidate.offer.bonus} · {candidate.offer.equity}
            </p>
          </div>
        </div>
      </Panel>

      <Panel className="flex flex-col gap-5">
        <div>
          <p className="dense-label">Offer generation wizard</p>
          <h2 className="mt-2 text-xl font-semibold text-gray-900">
            Review, edit, and send
          </h2>
        </div>
        <form action="/api/offers/send" method="post" className="grid gap-4">
          <input type="hidden" name="offerId" value={candidate.offer.id} />
          <input type="hidden" name="managerGreeting" value={candidate.offer.managerGreeting} />
          <label className="flex flex-col gap-1.5 text-sm font-medium text-gray-700">
            Job title
            <input
              name="jobTitle"
              defaultValue={candidate.jobTitle}
              className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm"
            />
          </label>
          <div className="grid gap-4 md:grid-cols-2">
            <label className="flex flex-col gap-1.5 text-sm font-medium text-gray-700">
              Start date
              <input
                name="startDate"
                defaultValue={candidate.offer.startDate.slice(0, 10)}
                type="date"
                className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm"
              />
            </label>
            <label className="flex flex-col gap-1.5 text-sm font-medium text-gray-700">
              Base salary
              <input
                name="baseSalary"
                defaultValue={candidate.offer.baseSalary}
                type="number"
                className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm"
              />
            </label>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <label className="flex flex-col gap-1.5 text-sm font-medium text-gray-700">
              Bonus
              <input
                name="bonus"
                defaultValue={candidate.offer.bonus}
                className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm"
              />
            </label>
            <label className="flex flex-col gap-1.5 text-sm font-medium text-gray-700">
              Equity
              <input
                name="equity"
                defaultValue={candidate.offer.equity}
                className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm"
              />
            </label>
          </div>
          <label className="flex flex-col gap-1.5 text-sm font-medium text-gray-700">
            Manager
            <input
              name="managerName"
              defaultValue={candidate.offer.managerName}
              className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm"
            />
          </label>
          <label className="flex flex-col gap-1.5 text-sm font-medium text-gray-700">
            Custom terms
            <textarea
              name="customTerms"
              defaultValue={candidate.offer.customTerms}
              rows={5}
              className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm"
            />
          </label>
          <div className="flex items-center justify-between gap-4 border-t border-gray-200 pt-4">
            <p className="text-sm text-gray-500">
              Sending routes the offer to DocuSign for e-signature.
            </p>
            <button
              type="submit"
              className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
            >
              Send for signature
            </button>
          </div>
        </form>
        <div className="rounded-lg border border-gray-200 bg-white p-5">
          <p className="dense-label">Manager greeting</p>
          <p className="mt-2 text-sm leading-relaxed text-gray-500">{candidate.offer.managerGreeting}</p>
          <p className="mt-3 text-sm font-semibold text-gray-900">
            Start date: {formatShortDate(candidate.offer.startDate)}
          </p>
        </div>
      </Panel>
    </section>
  );
}

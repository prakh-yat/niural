import Link from "next/link";

import { FlashBanner } from "@/components/ui/flash-banner";
import { Panel } from "@/components/ui/panel";
import { StatusPill } from "@/components/ui/status-pill";
import { listOfferDrafts } from "@/lib/server/data";
import { FLASH_COOKIE_NAMES, readFlashMessage } from "@/lib/server/flash";
import { formatCurrency, formatShortDate } from "@/lib/utils";

export default async function AdminOffersPage() {
  const [offers, flash] = await Promise.all([
    listOfferDrafts(),
    readFlashMessage(FLASH_COOKIE_NAMES.adminOffer),
  ]);

  const draftOffers = offers.filter((offer) => offer.status === "draft");
  const sentOffers = offers.filter((offer) => offer.status !== "draft");

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-gray-400">Draft offers</p>
        <h1 className="mt-2 text-2xl font-semibold text-gray-950">Offer review queue</h1>
        <p className="mt-2 text-sm leading-7 text-gray-500">
          Review AI-generated offer drafts, edit the terms, and send them only after final admin approval.
        </p>
      </div>

      {flash ? <FlashBanner cookieName={FLASH_COOKIE_NAMES.adminOffer} flash={flash} /> : null}

      <Panel className="overflow-hidden p-0">
        <div className="flex items-center justify-between gap-4 border-b border-gray-200 px-6 py-5">
          <div>
            <p className="text-sm font-semibold text-gray-950">Draft queue</p>
            <p className="mt-1 text-sm text-gray-500">
              {draftOffers.length} draft{draftOffers.length === 1 ? "" : "s"} awaiting review
            </p>
          </div>
          <StatusPill label={`${offers.length} total`} tone="preview" />
        </div>

        {offers.length === 0 ? (
          <div className="px-6 py-10 text-sm text-gray-500">No offer drafts have been created yet.</div>
        ) : (
          <div className="divide-y divide-gray-200">
            {offers.map((offer) => (
              <Link
                key={offer.id}
                href={`/niural-admin/offers/${offer.id}`}
                prefetch={false}
                className="grid gap-4 px-6 py-5 transition hover:bg-gray-50 md:grid-cols-[1.2fr_1fr_0.9fr_0.9fr_0.7fr]"
              >
                <div>
                  <p className="text-sm font-semibold text-gray-950">{offer.application.fullName}</p>
                  <p className="mt-1 text-sm text-gray-500">{offer.application.email}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-900">{offer.jobTitle}</p>
                  <p className="mt-1 text-sm text-gray-500">{offer.application.jobOpening.title}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-900">
                    {formatCurrency(offer.baseSalary)}
                  </p>
                  <p className="mt-1 text-sm text-gray-500">{formatShortDate(offer.startDate)}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Updated {formatShortDate(offer.updatedAt)}</p>
                  <p className="mt-1 text-sm text-gray-500">{offer.managerName}</p>
                </div>
                <div className="flex items-start justify-end">
                  <StatusPill label={offer.status} tone={offer.status} />
                </div>
              </Link>
            ))}
          </div>
        )}
      </Panel>

      {sentOffers.length > 0 ? (
        <Panel className="space-y-4">
          <div>
            <p className="text-sm font-semibold text-gray-950">Recently sent or completed</p>
            <p className="mt-1 text-sm text-gray-500">
              Keep track of envelopes that already left the draft queue.
            </p>
          </div>
          <div className="grid gap-3">
            {sentOffers.slice(0, 6).map((offer) => (
              <Link
                key={offer.id}
                href={`/niural-admin/offers/${offer.id}`}
                prefetch={false}
                className="flex items-center justify-between gap-4 rounded-2xl border border-gray-200 px-4 py-4 transition hover:bg-gray-50"
              >
                <div>
                  <p className="text-sm font-semibold text-gray-950">{offer.application.fullName}</p>
                  <p className="mt-1 text-sm text-gray-500">{offer.jobTitle}</p>
                </div>
                <StatusPill label={offer.status} tone={offer.status} />
              </Link>
            ))}
          </div>
        </Panel>
      ) : null}
    </div>
  );
}

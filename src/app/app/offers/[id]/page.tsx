import Link from "next/link";
import { notFound } from "next/navigation";

import { Panel } from "@/components/ui/panel";
import { StatusPill } from "@/components/ui/status-pill";
import { getOfferDraftById } from "@/lib/server/data";
import { formatCurrency, formatOfferStatusLabel, formatShortDate } from "@/lib/utils";

export default async function OfferDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const offer = await getOfferDraftById(id);

  if (!offer || offer.status === "draft") {
    notFound();
  }

  const managerGreeting =
    offer.application.candidate.managerGreeting || "We are excited to have you build with us.";
  const requiresDocusignEmail = Boolean(offer.docusignEnvelopeId);
  const offerPdfPath = offer.pdfStoragePath ?? `/api/offers/${offer.id}/pdf`;
  const candidateStatusLabel = formatOfferStatusLabel(offer.status, "candidate");

  return (
    <div className="mx-auto max-w-5xl px-6 py-10">
      <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">Offer Package</p>
      <h1 className="mt-2 text-2xl font-semibold text-gray-900">{offer.jobTitle}</h1>

      <div className="mt-8 grid gap-6 lg:grid-cols-[1fr_1.2fr]">
        <Panel className="flex flex-col gap-6">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-base font-semibold text-gray-900">Offer details</h2>
            <StatusPill label={candidateStatusLabel} tone={offer.status} />
          </div>
          <div className="grid gap-4">
            <div className="rounded-lg border border-gray-100 bg-gray-50 p-4">
              <p className="text-xs font-medium text-gray-400">Base salary</p>
              <p className="mt-2 text-lg font-semibold text-gray-900">
                {formatCurrency(offer.baseSalary)}
              </p>
            </div>
            <div className="rounded-lg border border-gray-100 bg-gray-50 p-4">
              <p className="text-xs font-medium text-gray-400">Start date</p>
              <p className="mt-2 text-lg font-semibold text-gray-900">
                {formatShortDate(offer.startDate)}
              </p>
            </div>
          </div>
          <p className="text-sm leading-relaxed text-gray-500">{managerGreeting}</p>
          {offer.customTerms ? (
            <div className="rounded-lg border border-gray-100 bg-white p-4">
              <p className="text-xs font-medium text-gray-400">Custom terms</p>
              <p className="mt-2 text-sm leading-relaxed text-gray-500">{offer.customTerms}</p>
            </div>
          ) : null}
        </Panel>

        <Panel className="flex flex-col gap-5">
          <div>
            <p className="text-xs font-medium text-gray-400">Signature handoff</p>
            <h2 className="mt-2 text-xl font-semibold text-gray-900">
              {requiresDocusignEmail ? "Review the DocuSign email" : "Review your offer in the portal"}
            </h2>
          </div>
          <div className="rounded-lg border border-gray-100 bg-white p-5">
            <p className="text-sm leading-relaxed text-gray-500">
              {requiresDocusignEmail
                ? "The hiring team has already handed the PDF offer letter to DocuSign. Keep an eye on your inbox for the secure signature email, and use the portal copy below as your reference."
                : "Your offer package and PDF copy are live in the portal now. If the DocuSign handoff is still being finalized, the hiring team can share the signature request separately after your review."}
            </p>
            <div className="mt-5 grid gap-3 text-sm text-gray-500 sm:grid-cols-2">
              <div className="rounded-lg border border-gray-100 bg-gray-50 px-4 py-3">
                Bonus: <span className="font-semibold text-gray-900">{offer.bonus || "N/A"}</span>
              </div>
              <div className="rounded-lg border border-gray-100 bg-gray-50 px-4 py-3">
                Equity: <span className="font-semibold text-gray-900">{offer.equity || "N/A"}</span>
              </div>
            </div>
            <div className="mt-5 flex flex-wrap gap-3">
              <a
                href={offerPdfPath}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center justify-center rounded-lg border border-violet-600 px-4 py-2 text-sm font-medium text-violet-600 hover:bg-violet-50"
              >
                Download offer PDF
              </a>
            </div>
          </div>
          <Link
            href="/app/offers"
            prefetch={false}
            className="inline-flex items-center justify-center rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            Back to offers
          </Link>
        </Panel>
      </div>

      <Panel className="mt-8">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-xs font-medium uppercase tracking-[0.18em] text-gray-400">
              Full offer letter
            </p>
            <h2 className="mt-2 text-xl font-semibold text-gray-900">
              Complete package preview
            </h2>
          </div>
          <a
            href={offerPdfPath}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center justify-center rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            Open PDF
          </a>
        </div>

        <div className="mt-6 overflow-hidden rounded-xl border border-gray-200">
          <iframe
            title="Offer PDF preview"
            src={offerPdfPath}
            className="h-[900px] w-full bg-white"
          />
        </div>
      </Panel>
    </div>
  );
}

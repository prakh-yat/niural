import Link from "next/link";
import { notFound } from "next/navigation";

import { FlashBanner } from "@/components/ui/flash-banner";
import { Panel } from "@/components/ui/panel";
import { StatusPill } from "@/components/ui/status-pill";
import { getOfferDraftById } from "@/lib/server/data";
import { FLASH_COOKIE_NAMES, readFlashMessage } from "@/lib/server/flash";
import { formatCurrency, formatLongDateTime, formatShortDate } from "@/lib/utils";

export default async function OfferWorkspacePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [offer, flash] = await Promise.all([
    getOfferDraftById(id),
    readFlashMessage(FLASH_COOKIE_NAMES.adminOffer),
  ]);

  if (!offer) {
    notFound();
  }

  const managerGreeting =
    offer.application.candidate.managerGreeting || "We are excited to have you build with us.";
  const isDraft = offer.status === "draft";
  const canRetryDocusign = offer.status === "sent" && !offer.docusignEnvelopeId;

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <nav className="flex items-center gap-2 text-sm text-gray-400">
        <Link href="/niural-admin" prefetch={false} className="hover:text-violet-600">
          Dashboard
        </Link>
        <span>/</span>
        <Link href="/niural-admin/offers" prefetch={false} className="hover:text-violet-600">
          Draft Offers
        </Link>
        <span>/</span>
        <span className="text-gray-600">{offer.application.fullName}</span>
      </nav>

      {flash ? <FlashBanner cookieName={FLASH_COOKIE_NAMES.adminOffer} flash={flash} /> : null}

      <div className="grid gap-6 lg:grid-cols-[360px_minmax(0,1fr)]">
        <Panel className="space-y-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-gray-400">
                Offer workspace
              </p>
              <h1 className="mt-2 text-2xl font-semibold text-gray-950">
                {offer.application.fullName}
              </h1>
              <p className="mt-1 text-sm text-gray-500">{offer.application.email}</p>
            </div>
            <StatusPill label={offer.status} tone={offer.status} />
          </div>

          <div className="grid gap-4">
            <div className="rounded-2xl border border-gray-200 bg-gray-50 px-4 py-4">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-gray-400">Role</p>
              <p className="mt-2 text-sm font-semibold text-gray-950">{offer.jobTitle}</p>
            </div>
            <div className="rounded-2xl border border-gray-200 bg-gray-50 px-4 py-4">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-gray-400">Compensation</p>
              <p className="mt-2 text-lg font-semibold text-gray-950">
                {formatCurrency(offer.baseSalary)}
              </p>
              <p className="mt-1 text-sm text-gray-500">
                {offer.bonus || "No bonus"} · {offer.equity || "No equity note"}
              </p>
            </div>
            <div className="rounded-2xl border border-gray-200 bg-gray-50 px-4 py-4">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-gray-400">Lifecycle</p>
              <p className="mt-2 text-sm text-gray-600">
                Created {formatShortDate(offer.createdAt)}
              </p>
              <p className="mt-1 text-sm text-gray-600">
                Updated {formatShortDate(offer.updatedAt)}
              </p>
              {offer.sentAt ? (
                <p className="mt-1 text-sm text-gray-600">
                  Sent {formatLongDateTime(offer.sentAt)}
                </p>
              ) : null}
              {offer.signedAt ? (
                <p className="mt-1 text-sm text-gray-600">
                  Signed {formatLongDateTime(offer.signedAt)}
                </p>
              ) : null}
            </div>
          </div>

          <div className="rounded-2xl border border-gray-200 bg-white px-4 py-4">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-gray-400">
              Candidate profile
            </p>
            <p className="mt-2 text-sm text-gray-600">
              Applied for {offer.application.jobOpening.title}
            </p>
            <Link
              href={`/niural-admin/candidates/${offer.application.id}`}
              prefetch={false}
              className="mt-3 inline-flex text-sm font-medium text-violet-600 transition hover:text-violet-800"
            >
              Open candidate profile
            </Link>
          </div>
        </Panel>

        <Panel className="space-y-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-gray-400">
                Hiring manager inputs
              </p>
              <h2 className="mt-2 text-2xl font-semibold text-gray-950">
                Review, edit, and send
              </h2>
              <p className="mt-2 text-sm leading-7 text-gray-500">
                Confirm the role, compensation, reporting line, and candidate-specific terms. The
                system uses these answers to regenerate a professional draft offer for review before
                sending the DocuSign envelope.
              </p>
            </div>
            {!isDraft ? (
              <span
                className={`rounded-full px-3 py-1 text-xs font-semibold ${
                  canRetryDocusign
                    ? "bg-amber-50 text-amber-700"
                    : "bg-emerald-50 text-emerald-700"
                }`}
              >
                {canRetryDocusign ? "DocuSign retry available" : "Sending locked after handoff"}
              </span>
            ) : null}
          </div>

          <form action="/api/offers/update" method="post" className="grid gap-6">
            <input type="hidden" name="offerId" value={offer.id} />

            <div className="grid gap-4 md:grid-cols-2">
              <label className="flex flex-col gap-1.5 text-sm font-medium text-gray-700">
                Job title
                <input
                  name="jobTitle"
                  defaultValue={offer.jobTitle}
                  className="rounded-xl border border-gray-300 bg-white px-3 py-2.5 text-sm"
                />
              </label>
              <label className="flex flex-col gap-1.5 text-sm font-medium text-gray-700">
                Manager name
                <input
                  name="managerName"
                  defaultValue={offer.managerName}
                  className="rounded-xl border border-gray-300 bg-white px-3 py-2.5 text-sm"
                />
              </label>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <label className="flex flex-col gap-1.5 text-sm font-medium text-gray-700">
                Start date
                <input
                  name="startDate"
                  defaultValue={offer.startDate.toISOString().slice(0, 10)}
                  type="date"
                  className="rounded-xl border border-gray-300 bg-white px-3 py-2.5 text-sm"
                />
              </label>
              <label className="flex flex-col gap-1.5 text-sm font-medium text-gray-700">
                Base salary
                <input
                  name="baseSalary"
                  defaultValue={offer.baseSalary}
                  type="number"
                  className="rounded-xl border border-gray-300 bg-white px-3 py-2.5 text-sm"
                />
              </label>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <label className="flex flex-col gap-1.5 text-sm font-medium text-gray-700">
                Bonus
                <input
                  name="bonus"
                  defaultValue={offer.bonus ?? ""}
                  className="rounded-xl border border-gray-300 bg-white px-3 py-2.5 text-sm"
                />
              </label>
              <label className="flex flex-col gap-1.5 text-sm font-medium text-gray-700">
                Equity
                <input
                  name="equity"
                  defaultValue={offer.equity ?? ""}
                  className="rounded-xl border border-gray-300 bg-white px-3 py-2.5 text-sm"
                />
              </label>
            </div>

            <label className="flex flex-col gap-1.5 text-sm font-medium text-gray-700">
              Manager greeting
              <textarea
                name="managerGreeting"
                defaultValue={managerGreeting}
                rows={3}
                className="rounded-xl border border-gray-300 bg-white px-3 py-3 text-sm"
              />
            </label>

            <label className="flex flex-col gap-1.5 text-sm font-medium text-gray-700">
              Custom terms
              <textarea
                name="customTerms"
                defaultValue={offer.customTerms ?? ""}
                rows={5}
                className="rounded-xl border border-gray-300 bg-white px-3 py-3 text-sm"
              />
            </label>

            <div className="rounded-[1.5rem] border border-gray-200 bg-gray-50 px-5 py-5">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-gray-400">
                    AI-generated draft preview
                  </p>
                  <p className="mt-2 text-sm text-gray-500">
                    This letter is regenerated from the manager inputs above and includes a dedicated
                    DocuSign signature anchor and date space.
                  </p>
                </div>
                <StatusPill label="DocuSign ready" tone="preview" />
              </div>
              <pre className="mt-4 overflow-x-auto whitespace-pre-wrap rounded-2xl bg-white px-4 py-4 text-sm leading-7 text-gray-700">
                {offer.markdown}
              </pre>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-gray-200 pt-4">
              <p className="text-sm text-gray-500">
                Save keeps the draft internal. Send emails the DocuSign envelope to the candidate.
              </p>
              <div className="flex flex-wrap gap-3">
                <button
                  type="submit"
                  disabled={!isDraft}
                  className="rounded-xl border border-gray-300 px-4 py-2.5 text-sm font-medium text-gray-700 transition hover:bg-gray-50"
                >
                  Save draft
                </button>
                <button
                  type="submit"
                  formAction="/api/offers/send"
                  disabled={!isDraft && !canRetryDocusign}
                  className="rounded-xl bg-violet-600 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-violet-700 disabled:cursor-not-allowed disabled:bg-violet-300"
                >
                  {canRetryDocusign ? "Retry DocuSign handoff" : "Send to candidate"}
                </button>
              </div>
            </div>
          </form>
        </Panel>
      </div>
    </div>
  );
}

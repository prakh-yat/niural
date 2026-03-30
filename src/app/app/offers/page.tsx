import Link from "next/link";

import { Panel } from "@/components/ui/panel";
import { StatusPill } from "@/components/ui/status-pill";
import { getViewer } from "@/lib/server/auth";
import { listCandidatesByEmail } from "@/lib/server/data";
import { formatCurrency, formatOfferStatusLabel, formatShortDate } from "@/lib/utils";

export default async function CandidateOffersPage() {
  const viewer = await getViewer("candidate");
  const applications = viewer ? await listCandidatesByEmail(viewer.email) : [];
  const offers = applications.filter(
    (application) => application.offer && application.offer.status !== "draft",
  );

  return (
    <div className="mx-auto max-w-5xl px-6 py-10">
      <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">Offers</p>
      <h1 className="mt-2 text-2xl font-semibold text-gray-900">Offer packages</h1>

      {offers.length === 0 ? (
        <Panel className="mt-8">
          <p className="text-sm text-gray-500">
            No offer package is available yet. This page updates as soon as the hiring team moves to offer stage.
          </p>
        </Panel>
      ) : (
        <div className="mt-8 grid gap-4">
          {offers.map((application) => (
            <Panel key={application.offer!.id} className="flex flex-col gap-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h2 className="text-base font-semibold text-gray-900">{application.jobTitle}</h2>
                  <p className="mt-1 text-sm text-gray-500">
                    {formatCurrency(application.offer!.baseSalary)} · starts{" "}
                    {formatShortDate(application.offer!.startDate)}
                  </p>
                </div>
                <StatusPill
                  label={formatOfferStatusLabel(application.offer!.status, "candidate")}
                  tone={application.offer!.status}
                />
              </div>

              <div className="rounded-lg border border-gray-100 bg-gray-50 px-4 py-3 text-sm text-gray-600">
                Manager: {application.offer!.managerName} · {application.offer!.equity}
              </div>

              <div>
                <Link
                  href={`/app/offers/${application.offer!.id}`}
                  prefetch={false}
                  className="inline-flex items-center rounded-lg border border-violet-600 px-4 py-2 text-sm font-medium text-violet-600 hover:bg-violet-50"
                >
                  Open offer package
                </Link>
              </div>
            </Panel>
          ))}
        </div>
      )}
    </div>
  );
}

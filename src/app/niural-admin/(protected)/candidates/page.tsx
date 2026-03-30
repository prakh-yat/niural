import Link from "next/link";

import { Panel } from "@/components/ui/panel";
import { StatusPill } from "@/components/ui/status-pill";
import { STAGE_LABELS } from "@/lib/domain";
import { listCandidates } from "@/lib/server/data";
import { formatShortDate } from "@/lib/utils";

export default async function AdminCandidatesPage() {
  const candidates = await listCandidates();

  return (
    <div className="mx-auto max-w-7xl space-y-8">
      <div>
        <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">Applications</p>
        <h1 className="mt-1 text-2xl font-semibold text-gray-900">Candidate queue</h1>
        <p className="mt-1 text-sm text-gray-500">
          Review every application, inspect profile preferences, and jump into the full candidate detail view.
        </p>
      </div>

      <Panel className="overflow-hidden rounded-xl p-0">
        <div className="border-b border-gray-100 px-6 py-4">
          <h2 className="text-base font-semibold text-gray-900">All applications</h2>
          <p className="mt-1 text-sm text-gray-500">{candidates.length} total candidates</p>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full">
            <thead>
              <tr className="border-b border-gray-100 text-left text-[11px] font-semibold uppercase tracking-wider text-gray-400">
                <th className="px-5 py-3">Candidate</th>
                <th className="px-5 py-3">Preferences</th>
                <th className="px-5 py-3">Role</th>
                <th className="px-5 py-3">Submitted</th>
                <th className="px-5 py-3">Stage</th>
                <th className="px-5 py-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody>
              {candidates.map((candidate) => (
                <tr
                  key={candidate.id}
                  className="border-t border-gray-100 text-sm text-gray-600 transition hover:bg-gray-50/70"
                >
                  <td className="px-5 py-4">
                    <p className="font-semibold text-gray-900">{candidate.fullName}</p>
                    <p className="text-xs text-gray-400">{candidate.email}</p>
                  </td>
                  <td className="px-5 py-4 text-xs text-gray-500">
                    <p>{candidate.profile.headline || "No headline set"}</p>
                    <p className="mt-1">{candidate.profile.preferredLocation || "No location set"}</p>
                  </td>
                  <td className="px-5 py-4">{candidate.jobTitle}</td>
                  <td className="px-5 py-4">{formatShortDate(candidate.submittedAt)}</td>
                  <td className="px-5 py-4">
                    <StatusPill label={STAGE_LABELS[candidate.stage]} tone={candidate.stage} />
                  </td>
                  <td className="px-5 py-4 text-right">
                    <Link
                      href={`/niural-admin/candidates/${candidate.id}`}
                      className="text-sm font-semibold text-violet-600 hover:text-violet-800"
                    >
                      Open
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>
    </div>
  );
}


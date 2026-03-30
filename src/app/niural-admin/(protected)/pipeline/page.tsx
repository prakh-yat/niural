import { HiringPipelineBoard } from "@/components/admin/hiring-pipeline-board";
import { listCandidates } from "@/lib/server/data";

export default async function HiringPipelinePage() {
  const candidates = await listCandidates();

  return (
    <div className="mx-auto max-w-7xl space-y-8">
      <div>
        <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">
          Hiring pipeline
        </p>
        <h1 className="mt-1 text-2xl font-semibold text-gray-900">Pipeline board</h1>
        <p className="mt-1 text-sm text-gray-500">
          Drag candidates between stages, record an internal override note, and scroll horizontally through the full hiring journey in one row.
        </p>
      </div>

      <HiringPipelineBoard initialCandidates={candidates} />
    </div>
  );
}

"use client";

import { useMemo, useState } from "react";

import { StageChangeDialog } from "@/components/admin/stage-change-dialog";
import {
  STAGE_LABELS,
  normalizePipelineStage,
  type ApplicationStageKey,
  type PipelineStageKey,
} from "@/lib/domain";

export function CandidateStageManager({
  applicationId,
  candidateName,
  currentStage,
}: {
  applicationId: string;
  candidateName: string;
  currentStage: ApplicationStageKey;
}) {
  const [open, setOpen] = useState(false);
  const initialStage = useMemo<PipelineStageKey>(
    () => normalizePipelineStage(currentStage),
    [currentStage],
  );

  return (
    <>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">
            Manual stage override
          </p>
          <p className="mt-2 text-sm text-gray-600">
            Current stage:{" "}
            <span className="font-semibold text-gray-900">{STAGE_LABELS[currentStage]}</span>
          </p>
        </div>
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="inline-flex items-center justify-center rounded-lg bg-violet-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-violet-700"
        >
          Update status with note
        </button>
      </div>

      {open ? (
        <StageChangeDialog
          applicationId={applicationId}
          candidateName={candidateName}
          currentStage={currentStage}
          initialStage={initialStage}
          open
          onClose={() => setOpen(false)}
        />
      ) : null}
    </>
  );
}

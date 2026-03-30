"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, X } from "lucide-react";

import {
  PIPELINE_STAGES,
  STAGE_LABELS,
  type ApplicationStageKey,
  type PipelineStageKey,
} from "@/lib/domain";

type StageChangeDialogProps = {
  applicationId: string;
  candidateName: string;
  currentStage: ApplicationStageKey;
  initialStage: PipelineStageKey;
  open: boolean;
  onClose: () => void;
  onUpdated?: (stage: PipelineStageKey) => void;
};

export function StageChangeDialog({
  applicationId,
  candidateName,
  currentStage,
  initialStage,
  open,
  onClose,
  onUpdated,
}: StageChangeDialogProps) {
  const router = useRouter();
  const [stage, setStage] = useState<PipelineStageKey>(initialStage);
  const [note, setNote] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!open) {
    return null;
  }

  async function handleSubmit() {
    if (!note.trim()) {
      setError("Add a note explaining why this stage change is being made.");
      return;
    }

    setPending(true);
    setError(null);

    const response = await fetch("/api/admin/applications/stage", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        applicationId,
        stage,
        note: note.trim(),
      }),
    });

    if (!response.ok) {
      const data = (await response.json().catch(() => null)) as { error?: string } | null;
      setError(data?.error ?? "The stage change could not be saved.");
      setPending(false);
      return;
    }

    onUpdated?.(stage);
    setPending(false);
    onClose();
    router.refresh();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 px-4">
      <div className="w-full max-w-xl rounded-[1.75rem] bg-white p-6 shadow-[0_35px_90px_rgba(15,23,42,0.24)]">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-violet-500">
              Admin override
            </p>
            <h3 className="mt-2 text-2xl font-semibold tracking-[-0.03em] text-gray-950">
              Update application stage
            </h3>
            <p className="mt-2 text-sm leading-6 text-gray-500">
              Move {candidateName} from {STAGE_LABELS[currentStage]} and record an internal note
              for the hiring team.
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="rounded-full border border-gray-200 p-2 text-gray-500 transition hover:bg-gray-50 hover:text-gray-900"
            aria-label="Close stage update dialog"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="mt-6 grid gap-4">
          <label className="grid gap-1.5 text-sm font-medium text-gray-700">
            New stage
            <select
              value={stage}
              onChange={(event) => setStage(event.target.value as PipelineStageKey)}
              className="rounded-xl border border-gray-200 bg-white px-3 py-3 text-sm text-gray-900 outline-none transition focus:border-violet-400 focus:ring-4 focus:ring-violet-500/10"
            >
              {PIPELINE_STAGES.map((option) => (
                <option key={option} value={option}>
                  {STAGE_LABELS[option]}
                </option>
              ))}
            </select>
          </label>

          <label className="grid gap-1.5 text-sm font-medium text-gray-700">
            Internal note
            <textarea
              value={note}
              onChange={(event) => setNote(event.target.value)}
              rows={5}
              placeholder="Example: Strong recruiter call. Clear product-ops ownership and relevant AI workflow experience."
              className="rounded-xl border border-gray-200 bg-white px-3 py-3 text-sm leading-6 text-gray-900 outline-none transition focus:border-violet-400 focus:ring-4 focus:ring-violet-500/10"
            />
          </label>
        </div>

        {error ? (
          <p className="mt-3 text-sm text-red-600">{error}</p>
        ) : null}

        <div className="mt-5 flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="rounded-full px-4 py-2 text-sm font-medium text-gray-500 transition hover:bg-gray-100 hover:text-gray-900"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={pending}
            onClick={() => void handleSubmit()}
            className="inline-flex items-center gap-2 rounded-full bg-[linear-gradient(135deg,#7c3aed,#5b21b6)] px-5 py-2.5 text-sm font-semibold text-white transition hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            {pending ? "Saving..." : "Save stage change"}
          </button>
        </div>
      </div>
    </div>
  );
}

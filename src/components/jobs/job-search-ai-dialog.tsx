"use client";

import { useState } from "react";
import { Sparkles, X } from "lucide-react";

type JobSearchAiDialogProps = {
  activePrompt: string;
  pending: boolean;
  onSubmit: (prompt: string) => Promise<void> | void;
  onClear: () => void;
};

export function JobSearchAiDialog({
  activePrompt,
  pending,
  onSubmit,
  onClear,
}: JobSearchAiDialogProps) {
  const [open, setOpen] = useState(false);
  const [prompt, setPrompt] = useState(activePrompt);

  return (
    <>
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="inline-flex items-center gap-2 rounded-lg border border-violet-200 bg-violet-50 px-4 py-2.5 text-sm font-medium text-violet-700 transition hover:bg-violet-100"
        >
          <Sparkles className="h-4 w-4" />
          Search jobs with AI
        </button>

        {activePrompt ? (
          <button
            type="button"
            onClick={() => {
              setPrompt("");
              onClear();
            }}
            className="text-sm font-medium text-gray-500 transition hover:text-gray-900"
          >
            Clear AI search
          </button>
        ) : null}
      </div>

      {open ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 px-4">
          <div className="w-full max-w-xl rounded-[2rem] bg-white p-6 shadow-[0_35px_90px_rgba(15,23,42,0.24)]">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-violet-500">
                  AI search
                </p>
                <h3 className="mt-2 text-2xl font-semibold tracking-[-0.03em] text-gray-950">
                  Describe the kind of work you want
                </h3>
                <p className="mt-2 text-sm leading-6 text-gray-500">
                  Include your strongest skills, preferred role family, seniority, location or
                  remote preference, industry context, and any salary floor or must-haves.
                </p>
              </div>

              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-full border border-gray-200 p-2 text-gray-500 transition hover:bg-gray-50 hover:text-gray-900"
                aria-label="Close AI search"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <label className="mt-6 block">
              <span className="sr-only">Describe your skills</span>
              <textarea
                value={prompt}
                onChange={(event) => setPrompt(event.target.value)}
                rows={7}
                placeholder="Example: I’m a senior product operator with AI workflow design, recruiter tooling, SQL, Notion, Zapier, and payroll ops experience. I want senior remote or New York roles above $170k, ideally in product ops, internal tools, or AI workflow systems."
                className="w-full rounded-[1.5rem] border border-gray-200 bg-[#fbfbfb] px-4 py-4 text-sm leading-6 text-gray-900 outline-none transition focus:border-violet-400 focus:ring-4 focus:ring-violet-500/10"
              />
            </label>

            <div className="mt-5 flex items-center justify-between gap-3">
              <p className="text-xs leading-5 text-gray-400">
                The jobs list will be re-ranked against your description.
              </p>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="rounded-full px-4 py-2 text-sm font-medium text-gray-500 transition hover:bg-gray-100 hover:text-gray-900"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={pending || !prompt.trim()}
                  onClick={async () => {
                    await onSubmit(prompt);
                    setOpen(false);
                  }}
                  className="rounded-full bg-[linear-gradient(135deg,#7c3aed,#5b21b6)] px-5 py-2.5 text-sm font-semibold text-white transition hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {pending ? "Ranking..." : "Show tailored results"}
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}

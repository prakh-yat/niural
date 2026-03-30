"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";

import { StageChangeDialog } from "@/components/admin/stage-change-dialog";
import {
  PIPELINE_STAGES,
  STAGE_LABELS,
  type PipelineStageKey,
  normalizePipelineStage,
  type ApplicationStageKey,
} from "@/lib/domain";

type PipelineCandidate = {
  id: string;
  fullName: string;
  email: string;
  jobTitle: string;
  score: number;
  stage: ApplicationStageKey;
  profile: {
    headline: string;
    preferredLocation: string;
    skills: string[];
    avatarUrl?: string;
  };
};

export function HiringPipelineBoard({
  initialCandidates,
}: {
  initialCandidates: PipelineCandidate[];
}) {
  const [candidates, setCandidates] = useState(
    initialCandidates.map((candidate) => ({
      ...candidate,
      stage: normalizePipelineStage(candidate.stage),
    })),
  );
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [pendingMove, setPendingMove] = useState<{
    applicationId: string;
    candidateName: string;
    currentStage: ApplicationStageKey;
    nextStage: PipelineStageKey;
  } | null>(null);

  const grouped = PIPELINE_STAGES.reduce<Record<PipelineStageKey, PipelineCandidate[]>>(
      (accumulator, stage) => {
        accumulator[stage] = candidates.filter((candidate) => candidate.stage === stage);
        return accumulator;
      },
      {
        applied: [],
        screened: [],
        shortlisted: [],
        interview_pending: [],
        interview_scheduled: [],
        interview_completed: [],
        offer_drafting: [],
        offer_sent: [],
        rejected: [],
      },
    );

  async function moveCandidate(candidateId: string, nextStage: PipelineStageKey) {
    setUpdatingId(candidateId);
    setCandidates((current) =>
      current.map((candidate) =>
        candidate.id === candidateId ? { ...candidate, stage: nextStage } : candidate,
      ),
    );
    setUpdatingId(null);
  }

  return (
    <>
      <div className="overflow-x-auto pb-2">
        <div className="flex min-w-max gap-4">
          {PIPELINE_STAGES.map((stage) => (
            <section
              key={stage}
              onDragOver={(event) => event.preventDefault()}
              onDrop={(event) => {
                event.preventDefault();
                const candidateId = event.dataTransfer.getData("text/plain");
                if (candidateId) {
                  const candidate = candidates.find((item) => item.id === candidateId);
                  if (candidate) {
                    setPendingMove({
                      applicationId: candidate.id,
                      candidateName: candidate.fullName,
                      currentStage: candidate.stage,
                      nextStage: stage,
                    });
                  }
                }
                setDraggedId(null);
              }}
              className="min-h-[32rem] w-[22rem] shrink-0 rounded-xl border border-gray-200 bg-white"
            >
              <div className="flex items-center justify-between border-b border-gray-100 px-4 py-3">
                <div>
                  <h2 className="text-sm font-semibold text-gray-900">{STAGE_LABELS[stage]}</h2>
                  <p className="text-xs text-gray-400">
                    {grouped[stage].length} candidate{grouped[stage].length === 1 ? "" : "s"}
                  </p>
                </div>
                <span className="rounded-full bg-gray-100 px-2.5 py-1 text-xs font-semibold text-gray-600">
                  {grouped[stage].length}
                </span>
              </div>

              <div className="space-y-3 p-3">
                {grouped[stage].length === 0 ? (
                  <div className="rounded-lg border border-dashed border-gray-200 px-3 py-8 text-center text-sm text-gray-400">
                    Drop candidates here
                  </div>
                ) : null}

                {grouped[stage].map((candidate: PipelineCandidate) => (
                  <article
                    key={candidate.id}
                    draggable
                    onDragStart={(event) => {
                      event.dataTransfer.setData("text/plain", candidate.id);
                      setDraggedId(candidate.id);
                    }}
                    onDragEnd={() => setDraggedId(null)}
                    className={`rounded-lg border border-gray-200 bg-gray-50 p-3 transition ${
                      draggedId === candidate.id ? "opacity-60" : "opacity-100"
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      {candidate.profile.avatarUrl ? (
                        <Image
                          src={candidate.profile.avatarUrl}
                          alt={`${candidate.fullName} avatar`}
                          width={40}
                          height={40}
                          unoptimized
                          className="h-10 w-10 rounded-xl object-cover"
                        />
                      ) : (
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-100 text-xs font-semibold text-violet-700">
                          {candidate.fullName
                            .split(" ")
                            .map((part: string) => part[0])
                            .join("")
                            .slice(0, 2)
                            .toUpperCase()}
                        </div>
                      )}

                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold text-gray-900">{candidate.fullName}</p>
                        <p className="truncate text-xs text-gray-500">{candidate.email}</p>
                      </div>
                      <span className="rounded-full bg-white px-2 py-1 text-xs font-semibold text-gray-700">
                        {candidate.score}
                      </span>
                    </div>

                    <p className="mt-3 text-sm font-medium text-gray-800">{candidate.jobTitle}</p>
                    {candidate.profile.headline ? (
                      <p className="mt-1 text-xs text-gray-500">{candidate.profile.headline}</p>
                    ) : null}
                    {candidate.profile.skills.length > 0 ? (
                      <div className="mt-3 flex flex-wrap gap-1.5">
                        {candidate.profile.skills.slice(0, 3).map((skill: string) => (
                          <span
                            key={skill}
                            className="rounded-full bg-white px-2 py-1 text-[11px] font-medium text-gray-600"
                          >
                            {skill}
                          </span>
                        ))}
                      </div>
                    ) : null}

                    <div className="mt-4 flex items-center justify-between">
                      <Link
                        href={`/niural-admin/candidates/${candidate.id}`}
                        className="text-xs font-semibold text-violet-600 hover:text-violet-800"
                      >
                        Open details
                      </Link>
                      {updatingId === candidate.id ? (
                        <span className="text-[11px] text-gray-400">Updating...</span>
                      ) : null}
                    </div>
                  </article>
                ))}
              </div>
            </section>
          ))}
        </div>
      </div>

      {pendingMove ? (
        <StageChangeDialog
          applicationId={pendingMove.applicationId}
          candidateName={pendingMove.candidateName}
          currentStage={pendingMove.currentStage}
          initialStage={pendingMove.nextStage}
          open
          onClose={() => setPendingMove(null)}
          onUpdated={(nextStage) => {
            void moveCandidate(pendingMove.applicationId, nextStage);
          }}
        />
      ) : null}
    </>
  );
}

import { NextResponse } from "next/server";

import type { JobRecord } from "@/lib/domain";
import { getViewer } from "@/lib/server/auth";
import { buildCandidateJobWorkspace } from "@/lib/server/job-board";
import { listJobs } from "@/lib/server/data";
import { rankJobsForCandidateSearch } from "@/lib/integrations/openrouter";

export async function POST(request: Request) {
  const body = (await request.json()) as {
    prompt?: string;
    jobIds?: string[];
    jobs?: JobRecord[];
    scope?: "public" | "candidate";
  };

  const prompt = body.prompt?.trim() ?? "";
  if (!prompt) {
    return NextResponse.json({ topJobIds: [], summary: null });
  }

  const isPublicSearch = body.scope === "public";
  const viewer = isPublicSearch ? null : await getViewer("candidate");
  const sourceJobs =
    isPublicSearch && Array.isArray(body.jobs) && body.jobs.length > 0
      ? body.jobs
      : isPublicSearch
        ? await listJobs()
        : viewer
          ? (
              await buildCandidateJobWorkspace({
                email: viewer.email,
                fullName: viewer.fullName,
              })
            ).jobs
          : await listJobs();
  const subset =
    Array.isArray(body.jobIds) && body.jobIds.length > 0
      ? sourceJobs.filter((job) => body.jobIds!.includes(job.id))
      : sourceJobs;

  const ranking = await rankJobsForCandidateSearch({
    query: prompt,
    jobs: subset,
  });

  return NextResponse.json({
    topJobIds: ranking?.topJobIds ?? [],
    summary: ranking?.summary ?? null,
  });
}

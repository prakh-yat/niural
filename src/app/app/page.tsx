import { CandidateJobsWorkspace } from "@/components/jobs/candidate-jobs-workspace";
import { buildCandidateJobWorkspace } from "@/lib/server/job-board";
import { getViewer } from "@/lib/server/auth";
import { listCandidatesByEmail } from "@/lib/server/data";

export default async function CandidateJobsPage() {
  const viewer = await getViewer("candidate");
  const [applications, workspace] = await Promise.all([
    viewer ? listCandidatesByEmail(viewer.email) : Promise.resolve([]),
    buildCandidateJobWorkspace({
      email: viewer?.email ?? "candidate@preview.local",
      fullName: viewer?.fullName ?? "Candidate",
    }),
  ]);

  const interviewsPending = applications.filter(
    (application) =>
      application.stage === "interview_pending" || application.stage === "interview_scheduled",
  ).length;
  const offersActive = applications.filter((application) =>
    ["offer_drafting", "offer_sent", "offer_signed"].includes(application.stage),
  ).length;

  return (
    <CandidateJobsWorkspace
      jobs={workspace.jobs}
      preferences={workspace.preferences}
      filterOptions={workspace.filterOptions}
      applicationsCount={applications.length}
      interviewsPending={interviewsPending}
      offersActive={offersActive}
    />
  );
}


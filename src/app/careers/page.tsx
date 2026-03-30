import { PublicJobsWorkspace } from "@/components/jobs/public-jobs-workspace";
import { PageFrame } from "@/components/shell/page-frame";
import { listJobs } from "@/lib/server/data";

export default async function CareersPage() {
  const jobs = await listJobs();
  const filterOptions = {
    teams: Array.from(new Set(jobs.map((job) => job.team))).sort(),
    locations: Array.from(new Set(jobs.map((job) => job.location))).sort(),
    remotes: Array.from(new Set(jobs.map((job) => job.remoteLabel))).sort(),
    experiences: Array.from(new Set(jobs.map((job) => job.experienceLevel))).sort(),
  };

  return (
    <PageFrame>
      <PublicJobsWorkspace jobs={jobs} filterOptions={filterOptions} />
    </PageFrame>
  );
}

import { AdminDashboardWorkspace } from "@/components/admin/admin-dashboard-workspace";
import { listCandidates, listJobs } from "@/lib/server/data";

export default async function AdminDashboardPage() {
  const [candidates, jobs] = await Promise.all([listCandidates(), listJobs()]);

  return (
    <AdminDashboardWorkspace
      candidates={candidates.map((candidate) => ({
        id: candidate.id,
        fullName: candidate.fullName,
        email: candidate.email,
        jobTitle: candidate.jobTitle,
        submittedAt: candidate.submittedAt,
        score: candidate.score,
        stage: candidate.stage,
      }))}
      openRoles={jobs.filter((job) => job.status === "open").length}
      roleOptions={Array.from(new Set(candidates.map((candidate) => candidate.jobTitle))).sort()}
    />
  );
}

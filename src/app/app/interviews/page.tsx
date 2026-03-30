import Link from "next/link";

import { Panel } from "@/components/ui/panel";
import { getViewer } from "@/lib/server/auth";
import { listCandidatesByEmail } from "@/lib/server/data";
import { formatLongDateTime } from "@/lib/utils";

export default async function CandidateInterviewsPage() {
  const viewer = await getViewer("candidate");
  const applications = viewer ? await listCandidatesByEmail(viewer.email) : [];
  const interviews = applications.filter((application) => application.interview.status !== "queued");

  return (
    <div className="mx-auto max-w-5xl px-6 py-10">
      <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">Interviews</p>
      <h1 className="mt-2 text-2xl font-semibold text-gray-900">Your interview schedule</h1>

      {interviews.length === 0 ? (
        <Panel className="mt-8">
          <p className="text-sm text-gray-500">
            You do not have a confirmed interview yet. Once scheduling moves forward, it will show up here.
          </p>
        </Panel>
      ) : (
        <div className="mt-8 grid gap-4">
          {interviews.map((application) => (
            <Panel key={application.interview.id} className="flex flex-col gap-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h2 className="text-base font-semibold text-gray-900">{application.jobTitle}</h2>
                  <p className="mt-1 text-sm text-gray-500">
                    {application.interview.confirmedAt
                      ? formatLongDateTime(application.interview.confirmedAt)
                      : "Scheduling in progress"}
                  </p>
                </div>
                <span className="rounded-full bg-violet-50 px-3 py-1 text-xs font-semibold text-violet-700">
                  {application.interview.status.replaceAll("_", " ")}
                </span>
              </div>

              <div className="rounded-lg border border-gray-100 bg-gray-50 px-4 py-3 text-sm text-gray-600">
                Interviewer:{" "}
                {application.interview.interviewerName || "Connected interviewer calendar"}
                {application.interview.interviewerEmail
                  ? ` · ${application.interview.interviewerEmail}`
                  : ""}
              </div>

              <div>
                <Link
                  href={`/app/interviews/${application.interview.id}`}
                  prefetch={false}
                  className="inline-flex items-center rounded-lg bg-violet-600 px-4 py-2 text-sm font-medium text-white hover:bg-violet-700"
                >
                  View interview details
                </Link>
              </div>
            </Panel>
          ))}
        </div>
      )}
    </div>
  );
}

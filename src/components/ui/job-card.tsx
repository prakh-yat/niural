import Link from "next/link";
import { Briefcase, MapPin, Clock, DollarSign } from "lucide-react";

import type { JobRecord } from "@/lib/domain";

export function JobCard({ job }: { job: JobRecord }) {
  return (
    <Link
      href={`/jobs/${job.slug}`}
      className="group flex flex-col rounded-xl border border-gray-200 bg-white p-5 transition hover:border-violet-200 hover:shadow-md"
    >
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-violet-50 text-violet-600 text-sm font-bold">
          {job.title.charAt(0)}
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="text-sm font-semibold text-gray-900 group-hover:text-violet-700">
            {job.title}
          </h3>
          <p className="mt-0.5 text-xs text-gray-500">{job.team}</p>
          <p className="mt-0.5 flex items-center gap-1 text-xs text-gray-400">
            <MapPin className="h-3 w-3" />
            {job.location}
          </p>
        </div>
      </div>

      <div className="mt-3 flex flex-wrap gap-1.5">
        {job.requirements.slice(0, 2).map((req) => {
          const tag = req.split(" ").slice(0, 2).join(" ").replace(/[^a-zA-Z0-9+ ]/g, "");
          return (
            <span
              key={req}
              className="rounded-md bg-gray-100 px-2 py-0.5 text-[10px] font-medium text-gray-600"
            >
              {tag}
            </span>
          );
        })}
      </div>

      <div className="mt-3 flex items-center gap-3 border-t border-gray-100 pt-3 text-[11px] text-gray-400">
        <span className="flex items-center gap-1">
          <Briefcase className="h-3 w-3" />
          {job.experienceLevel}
        </span>
        <span className="flex items-center gap-1">
          <Clock className="h-3 w-3" />
          {job.remoteLabel}
        </span>
        {job.compensationBand && (
          <span className="flex items-center gap-1">
            <DollarSign className="h-3 w-3" />
            {job.compensationBand}
          </span>
        )}
      </div>
    </Link>
  );
}

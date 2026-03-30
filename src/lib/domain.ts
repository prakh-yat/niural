export type RoleKey = "candidate" | "hiring_team" | "admin";

export const JOB_STATUSES = ["open", "paused", "closed"] as const;

export type JobStatusKey = (typeof JOB_STATUSES)[number];

export type ApplicationStageKey =
  | "applied"
  | "screened"
  | "shortlisted"
  | "rejected"
  | "interview_pending"
  | "interview_scheduled"
  | "interview_completed"
  | "offer_drafting"
  | "offer_sent"
  | "offer_signed"
  | "onboarded";

export type JobRecord = {
  id: string;
  slug: string;
  postedAt: string;
  title: string;
  team: string;
  location: string;
  remoteLabel: string;
  experienceLevel: string;
  overview: string;
  responsibilities: string[];
  requirements: string[];
  differentiators: string[];
  aiLeverageSummary: string;
  compensationBand: string;
  status: JobStatusKey;
};

export type CandidateRecord = {
  id: string;
  fullName: string;
  email: string;
  linkedInUrl?: string;
  portfolioUrl?: string;
  jobTitle: string;
  stage: ApplicationStageKey;
  score: number;
  submittedAt: string;
  location: string;
  profile: {
    headline: string;
    preferredLocation: string;
    skills: string[];
    desiredSalaryMin?: number;
    desiredSalaryMax?: number;
    avatarUrl?: string;
  };
  fitSummary: string;
  strengths: string[];
  gaps: string[];
  statusHistory?: {
    stage: ApplicationStageKey | string;
    at: string;
    note: string;
    actor?: "ai" | "admin" | "candidate" | "system";
    visibility?: "public" | "admin";
  }[];
  research: {
    brief: string;
    githubSummary: string;
    linkedInSummary: string;
    xSummary: string;
    discrepancies: string[];
    completeness: "complete" | "partial";
    sources: { label: string; href: string }[];
  };
  interview: {
    id: string;
    interviewerName: string;
    interviewerEmail: string;
    status: "queued" | "offered" | "scheduled" | "completed" | "cancelled" | "no_show";
    offeredSlots: { label: string; startsAt: string; endsAt: string; status: string }[];
    rescheduleRequest?: {
      requestedAt: string;
      requestedBy: "admin" | "candidate";
      rescheduleNotes: string;
      approvalStatus: "pending" | "approved" | "declined";
      proposedSlots: { label: string; startsAt: string; endsAt: string; status: string }[];
      aiMessage?: string;
      aiIteration?: number;
    };
    confirmedAt?: string;
    meetingUrl?: string;
    transcriptSummary?: string;
    transcriptExcerpt?: string;
    transcriptText?: string;
    transcriptTurns?: { speaker: string; text: string }[];
    transcriptDecision?: "selected" | "rejected";
  };
  offer?: {
    id: string;
    status: "draft" | "sent" | "signed" | "declined" | "voided";
    startDate: string;
    baseSalary: number;
    bonus: string;
    equity: string;
    managerName: string;
    managerGreeting: string;
    customTerms: string;
  };
};

export const STAGE_LABELS: Record<ApplicationStageKey, string> = {
  applied: "Applied",
  screened: "Screened",
  shortlisted: "Shortlisted",
  rejected: "Rejected",
  interview_pending: "Interview Pending",
  interview_scheduled: "Interview Scheduled",
  interview_completed: "Interview Completed",
  offer_drafting: "Offer Drafting",
  offer_sent: "Offer Sent",
  offer_signed: "Offer Signed",
  onboarded: "Onboarded",
};

export const PIPELINE_STAGES = [
  "applied",
  "screened",
  "shortlisted",
  "interview_pending",
  "interview_scheduled",
  "interview_completed",
  "offer_drafting",
  "offer_sent",
  "rejected",
 ] as const satisfies readonly ApplicationStageKey[];

export type PipelineStageKey = (typeof PIPELINE_STAGES)[number];

export function normalizePipelineStage(stage: ApplicationStageKey): PipelineStageKey {
  if (stage === "offer_signed" || stage === "onboarded") {
    return "offer_sent";
  }

  return PIPELINE_STAGES.includes(stage as PipelineStageKey) ? (stage as PipelineStageKey) : "applied";
}

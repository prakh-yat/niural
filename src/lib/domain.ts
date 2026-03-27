export type RoleKey = "candidate" | "hiring_team" | "admin";

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
  status: "open" | "paused" | "closed";
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
  fitSummary: string;
  strengths: string[];
  gaps: string[];
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
    confirmedAt?: string;
    meetingUrl?: string;
    transcriptSummary?: string;
    transcriptExcerpt?: string;
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

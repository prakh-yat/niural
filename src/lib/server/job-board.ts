import "server-only";

import { prisma } from "@/lib/prisma";
import type { JobRecord } from "@/lib/domain";
import { listJobs } from "@/lib/server/data";
import {
  buildCandidateProfileMetadata,
  getCandidateProfileSettings,
  readCandidateProfileMetadata,
  uniqueCandidateStrings,
} from "@/lib/server/candidate-profile";
import { rankJobsForCandidateSearch } from "@/lib/integrations/openrouter";

export type JobBoardTab = "matches" | "recent" | "saved";

export type CandidateJobPreferences = {
  fullName: string;
  headline: string;
  preferredLocation: string;
  skills: string[];
  savedJobIds: string[];
  desiredSalaryMin?: number;
  desiredSalaryMax?: number;
  applicationInterests: string[];
};

export type JobBoardFilters = {
  tab: JobBoardTab;
  query: string;
  location: string;
  team: string;
  remote: string;
  experience: string;
  salaryMin?: number;
  salaryMax?: number;
  aiPrompt: string;
  page: number;
};

export type JobBoardItem = JobRecord & {
  matchScore: number;
  isSaved: boolean;
  compensationMin?: number;
  compensationMax?: number;
};

export type JobBoardResult = {
  items: JobBoardItem[];
  total: number;
  page: number;
  pageCount: number;
  counts: Record<JobBoardTab, number>;
  preferences: CandidateJobPreferences;
  aiSummary: string | null;
  totalJobs: number;
  filterOptions: {
    teams: string[];
    locations: string[];
    remotes: string[];
    experiences: string[];
  };
};

const JOBS_PER_PAGE = 10;

function uniqueStrings(values: string[]) {
  return uniqueCandidateStrings(values);
}

function normalizeText(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9\s/+.-]/g, " ");
}

function extractTokens(value: string) {
  return uniqueStrings(
    normalizeText(value)
      .split(/\s+/)
      .filter((token) => token.length >= 3),
  );
}

function parseCompensationBand(band: string) {
  const matches = band.match(/\$?([\d,]+)(?:k)?/gi) ?? [];
  const numbers = matches
    .map((match) => {
      const normalized = match.replace(/[^0-9k]/gi, "").toLowerCase();
      if (!normalized) return null;
      if (normalized.endsWith("k")) {
        return Number(normalized.slice(0, -1)) * 1000;
      }
      return Number(normalized.replace(/,/g, ""));
    })
    .filter((value): value is number => typeof value === "number" && !Number.isNaN(value));

  if (numbers.length === 0) {
    return {};
  }

  const min = Math.min(...numbers);
  const max = Math.max(...numbers);
  return { min, max };
}

function getJobSearchText(job: JobRecord) {
  return normalizeText(
    [
      job.title,
      job.team,
      job.location,
      job.remoteLabel,
      job.experienceLevel,
      job.overview,
      job.aiLeverageSummary,
      ...job.requirements,
      ...job.responsibilities,
      ...job.differentiators,
    ].join(" "),
  );
}

function scoreJob(job: JobRecord, preferences: CandidateJobPreferences, aiPrompt: string) {
  const jobText = getJobSearchText(job);
  const profileTokens = extractTokens(
    [
      preferences.headline,
      preferences.preferredLocation,
      ...preferences.skills,
      ...preferences.applicationInterests,
    ].join(" "),
  );
  const aiTokens = extractTokens(aiPrompt);
  let score = 32;

  for (const token of profileTokens) {
    if (jobText.includes(token)) {
      score += 5;
    }
  }

  for (const token of aiTokens) {
    if (jobText.includes(token)) {
      score += 7;
    }
  }

  if (preferences.preferredLocation) {
    const preferredLocation = normalizeText(preferences.preferredLocation);
    if (jobText.includes(preferredLocation) || job.remoteLabel.toLowerCase().includes("remote")) {
      score += 12;
    }
  }

  const compensation = parseCompensationBand(job.compensationBand);

  if (
    preferences.desiredSalaryMin &&
    compensation.max &&
    compensation.max >= preferences.desiredSalaryMin
  ) {
    score += 8;
  }

  if (
    preferences.desiredSalaryMax &&
    compensation.min &&
    compensation.min <= preferences.desiredSalaryMax
  ) {
    score += 6;
  }

  return Math.max(1, Math.min(99, score));
}

async function applyAiRanking(
  jobs: JobRecord[],
  aiPrompt: string,
  scoreLookup: Map<string, number>,
) {
  const aiRanking = await rankJobsForCandidateSearch({
    query: aiPrompt,
    jobs: jobs.slice(0, 30),
  });

  if (!aiRanking?.topJobIds.length) {
    return {
      jobs,
      summary: null,
    };
  }

  const ranked = new Map(aiRanking.topJobIds.map((id, index) => [id, index]));
  const ordered = [...jobs].sort((left, right) => {
    const leftRank = ranked.get(left.id);
    const rightRank = ranked.get(right.id);

    if (leftRank != null && rightRank != null) {
      return leftRank - rightRank;
    }

    if (leftRank != null) return -1;
    if (rightRank != null) return 1;

    return (scoreLookup.get(right.id) ?? 0) - (scoreLookup.get(left.id) ?? 0);
  });

  return {
    jobs: ordered,
    summary: aiRanking.summary,
  };
}

export async function getCandidateJobPreferences(email: string, fullName: string) {
  const profile = await getCandidateProfileSettings(email, fullName);

  return {
    fullName: profile.fullName,
    headline: profile.headline,
    preferredLocation: profile.preferredLocation,
    skills: profile.skills,
    savedJobIds: profile.savedJobIds,
    desiredSalaryMin: profile.desiredSalaryMin,
    desiredSalaryMax: profile.desiredSalaryMax,
    applicationInterests: profile.applicationInterests,
  } satisfies CandidateJobPreferences;
}

export async function updateCandidateJobPreferences(input: {
  email: string;
  fullName: string;
  headline: string;
  preferredLocation: string;
  skills: string[];
  desiredSalaryMin?: number;
  desiredSalaryMax?: number;
}) {
  const existing = await prisma.profile.findUnique({
    where: { email: input.email },
    select: { metadata: true },
  });

  const metadata = readCandidateProfileMetadata(existing?.metadata);

  await prisma.profile.upsert({
    where: { email: input.email },
    update: {
      fullName: input.fullName,
      role: "candidate",
      title: input.headline || null,
      location: input.preferredLocation || null,
      metadata: buildCandidateProfileMetadata({
        ...metadata,
        skills: uniqueStrings(input.skills),
        desiredSalaryMin: input.desiredSalaryMin,
        desiredSalaryMax: input.desiredSalaryMax,
      }),
    },
    create: {
      email: input.email,
      fullName: input.fullName,
      role: "candidate",
      title: input.headline || null,
      location: input.preferredLocation || null,
      metadata: buildCandidateProfileMetadata({
        ...metadata,
        skills: uniqueStrings(input.skills),
        desiredSalaryMin: input.desiredSalaryMin,
        desiredSalaryMax: input.desiredSalaryMax,
      }),
    },
  });
}

export async function setSavedJobState(input: {
  email: string;
  fullName: string;
  jobId: string;
  saved: boolean;
}) {
  const preferences = await getCandidateJobPreferences(input.email, input.fullName);
  const existing = await prisma.profile.findUnique({
    where: { email: input.email },
    select: { metadata: true },
  });
  const metadata = readCandidateProfileMetadata(existing?.metadata);
  const savedJobIds = input.saved
    ? uniqueStrings([...preferences.savedJobIds, input.jobId])
    : preferences.savedJobIds.filter((savedJobId) => savedJobId !== input.jobId);

  await prisma.profile.upsert({
    where: { email: input.email },
    update: {
      fullName: preferences.fullName,
      role: "candidate",
      title: preferences.headline || null,
      location: preferences.preferredLocation || null,
      metadata: buildCandidateProfileMetadata({
        savedJobIds,
        skills: preferences.skills,
        desiredSalaryMin: preferences.desiredSalaryMin,
        desiredSalaryMax: preferences.desiredSalaryMax,
        avatarPath: metadata.avatarPath,
        avatarDataUrl: metadata.avatarDataUrl,
      }),
    },
    create: {
      email: input.email,
      fullName: input.fullName,
      role: "candidate",
      title: preferences.headline || null,
      location: preferences.preferredLocation || null,
      metadata: buildCandidateProfileMetadata({
        savedJobIds,
        skills: preferences.skills,
        desiredSalaryMin: preferences.desiredSalaryMin,
        desiredSalaryMax: preferences.desiredSalaryMax,
      }),
    },
  });
}

export async function buildCandidateJobWorkspace(input: {
  email: string;
  fullName: string;
}) {
  const [jobs, preferences] = await Promise.all([
    listJobs(),
    getCandidateJobPreferences(input.email, input.fullName),
  ]);

  const items = jobs.map((job) => {
    const compensation = parseCompensationBand(job.compensationBand);

    return {
      ...job,
      matchScore: scoreJob(job, preferences, ""),
      isSaved: preferences.savedJobIds.includes(job.id),
      compensationMin: compensation.min,
      compensationMax: compensation.max,
    } satisfies JobBoardItem;
  });

  return {
    jobs: items,
    preferences,
    filterOptions: {
      teams: uniqueStrings(jobs.map((job) => job.team)).sort(),
      locations: uniqueStrings(jobs.map((job) => job.location)).sort(),
      remotes: uniqueStrings(jobs.map((job) => job.remoteLabel)).sort(),
      experiences: uniqueStrings(jobs.map((job) => job.experienceLevel)).sort(),
    },
  };
}

export async function buildCandidateJobBoard(input: {
  email: string;
  fullName: string;
  filters: JobBoardFilters;
}) {
  const [jobs, preferences] = await Promise.all([
    listJobs(),
    getCandidateJobPreferences(input.email, input.fullName),
  ]);

  const baseFiltered = jobs.filter((job) => {
    const searchText = getJobSearchText(job);
    const compensation = parseCompensationBand(job.compensationBand);

    if (
      input.filters.query &&
      !searchText.includes(normalizeText(input.filters.query))
    ) {
      return false;
    }

    if (
      input.filters.location &&
      !normalizeText(job.location).includes(normalizeText(input.filters.location))
    ) {
      return false;
    }

    if (
      input.filters.team &&
      normalizeText(job.team) !== normalizeText(input.filters.team)
    ) {
      return false;
    }

    if (
      input.filters.remote &&
      normalizeText(job.remoteLabel) !== normalizeText(input.filters.remote)
    ) {
      return false;
    }

    if (
      input.filters.experience &&
      normalizeText(job.experienceLevel) !== normalizeText(input.filters.experience)
    ) {
      return false;
    }

    if (
      input.filters.salaryMin &&
      compensation.max &&
      compensation.max < input.filters.salaryMin
    ) {
      return false;
    }

    if (
      input.filters.salaryMax &&
      compensation.min &&
      compensation.min > input.filters.salaryMax
    ) {
      return false;
    }

    return true;
  });

  const scoreLookup = new Map(
    baseFiltered.map((job) => [
      job.id,
      scoreJob(job, preferences, input.filters.aiPrompt),
    ]),
  );

  const savedJobs = baseFiltered.filter((job) => preferences.savedJobIds.includes(job.id));
  const recentJobs = [...baseFiltered].sort(
    (left, right) => new Date(right.postedAt).getTime() - new Date(left.postedAt).getTime(),
  );

  let matchJobs = [...baseFiltered].sort((left, right) => {
    const scoreDelta = (scoreLookup.get(right.id) ?? 0) - (scoreLookup.get(left.id) ?? 0);
    if (scoreDelta !== 0) {
      return scoreDelta;
    }

    return new Date(right.postedAt).getTime() - new Date(left.postedAt).getTime();
  });

  let aiSummary: string | null = null;

  if (input.filters.aiPrompt) {
    const ranked = await applyAiRanking(matchJobs, input.filters.aiPrompt, scoreLookup);
    matchJobs = ranked.jobs;
    aiSummary = ranked.summary;
  }

  const counts = {
    matches: matchJobs.length,
    recent: recentJobs.length,
    saved: savedJobs.length,
  } satisfies Record<JobBoardTab, number>;

  const selected =
    input.filters.tab === "saved"
      ? savedJobs
      : input.filters.tab === "recent"
        ? recentJobs
        : matchJobs;

  const pageCount = Math.max(1, Math.ceil(selected.length / JOBS_PER_PAGE));
  const page = Math.min(Math.max(1, input.filters.page), pageCount);
  const offset = (page - 1) * JOBS_PER_PAGE;
  const items = selected.slice(offset, offset + JOBS_PER_PAGE).map((job) => {
    const compensation = parseCompensationBand(job.compensationBand);

    return {
      ...job,
      matchScore: scoreLookup.get(job.id) ?? 0,
      isSaved: preferences.savedJobIds.includes(job.id),
      compensationMin: compensation.min,
      compensationMax: compensation.max,
    };
  });

  return {
    items,
    total: selected.length,
    page,
    pageCount,
    counts,
    preferences,
    aiSummary,
    totalJobs: jobs.length,
    filterOptions: {
      teams: uniqueStrings(jobs.map((job) => job.team)).sort(),
      locations: uniqueStrings(jobs.map((job) => job.location)).sort(),
      remotes: uniqueStrings(jobs.map((job) => job.remoteLabel)).sort(),
      experiences: uniqueStrings(jobs.map((job) => job.experienceLevel)).sort(),
    },
  } satisfies JobBoardResult;
}

import OpenAI from "openai";

import type { JobRecord } from "@/lib/domain";
import { env, envFlags } from "@/lib/env";

type ScreeningPayload = {
  fitScore: number;
  rationale: string;
  strengths: string[];
  gaps: string[];
  skills: string[];
  yearsExperience: number;
  education: string[];
  pastEmployers: string[];
  achievements: string[];
};

type ResearchPayload = {
  candidateBrief: string;
  githubSummary: string;
  linkedInSummary: string;
  xSummary: string;
  discrepancyFlags: string[];
  completeness: "complete" | "partial";
};

type JobSearchPayload = {
  topJobIds: string[];
  summary: string;
};

type CandidateRescheduleSuggestionPayload = {
  startsAt: string;
  message: string;
};

type OfferLetterPayload = {
  openingParagraph: string;
  roleParagraph: string;
  compensationParagraph: string;
  termsParagraph: string;
  managerNote: string;
  closingParagraph: string;
};

type InterviewAnalysisPayload = {
  decision: "selected" | "rejected";
  summary: string;
  rationale: string;
  strengths: string[];
  concerns: string[];
  followUpNotes: string[];
  managerGreeting: string;
  customTerms: string;
};

type JobSearchHeuristicResult = {
  topJobIds: string[];
  summary: string;
  scoreById: Map<string, number>;
};

const JOB_SEARCH_SYNONYM_GROUPS = {
  backend: [
    "backend",
    "back end",
    "server",
    "api",
    "apis",
    "platform",
    "services",
    "microservices",
    "database",
    "databases",
    "distributed systems",
    "node",
    "node.js",
    "typescript",
    "python",
    "golang",
    "java",
  ],
  coding: [
    "coding",
    "code",
    "developer",
    "development",
    "engineer",
    "engineering",
    "software",
    "programming",
    "build",
    "ship",
  ],
  data: [
    "data",
    "pipeline",
    "etl",
    "analytics",
    "warehouse",
    "sql",
    "dbt",
    "airflow",
    "dagster",
  ],
  frontend: [
    "frontend",
    "front end",
    "ui",
    "ux",
    "react",
    "next.js",
    "design system",
  ],
  infra: [
    "infra",
    "infrastructure",
    "devops",
    "sre",
    "cloud",
    "kubernetes",
    "terraform",
    "deployment",
    "reliability",
  ],
} as const;

function normalizeJobSearchText(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9\s/+.-]/g, " ");
}

function uniqueTokens(values: string[]) {
  return Array.from(new Set(values.filter(Boolean)));
}

function buildJobSearchHaystacks(job: JobRecord) {
  return {
    title: normalizeJobSearchText(job.title),
    team: normalizeJobSearchText(job.team),
    location: normalizeJobSearchText(job.location),
    remote: normalizeJobSearchText(job.remoteLabel),
    level: normalizeJobSearchText(job.experienceLevel),
    overview: normalizeJobSearchText(job.overview),
    responsibilities: normalizeJobSearchText(job.responsibilities.join(" ")),
    requirements: normalizeJobSearchText(job.requirements.join(" ")),
    differentiators: normalizeJobSearchText(job.differentiators.join(" ")),
    aiSummary: normalizeJobSearchText(job.aiLeverageSummary),
    full: normalizeJobSearchText(
      [
        job.title,
        job.team,
        job.location,
        job.remoteLabel,
        job.experienceLevel,
        job.overview,
        job.aiLeverageSummary,
        ...job.responsibilities,
        ...job.requirements,
        ...job.differentiators,
      ].join(" "),
    ),
  };
}

function expandJobSearchQuery(query: string) {
  const normalized = normalizeJobSearchText(query);
  const baseTokens = normalized
    .split(/\s+/)
    .map((token) => token.trim())
    .filter((token) => token.length >= 3);

  const expanded = new Set(baseTokens);

  for (const aliases of Object.values(JOB_SEARCH_SYNONYM_GROUPS)) {
    if (aliases.some((alias) => normalized.includes(alias))) {
      aliases.forEach((alias) => expanded.add(alias));
    }
  }

  if (normalized.includes("backend") || normalized.includes("coding")) {
    [
      "engineer",
      "engineering",
      "full stack",
      "full-stack",
      "platform",
      "api",
      "server",
      "typescript",
      "node",
    ].forEach((token) => expanded.add(token));
  }

  return uniqueTokens(Array.from(expanded));
}

function buildHeuristicJobSearchSummary(query: string, topJobs: JobRecord[]) {
  if (topJobs.length === 0) {
    return `No strong AI-assisted matches were found for "${query}".`;
  }

  const topTitles = topJobs.slice(0, 3).map((job) => job.title).join(", ");
  return `Recommended based on the strongest fit with "${query}", especially roles like ${topTitles}.`;
}

function buildHeuristicJobSearchRanking(input: {
  query: string;
  jobs: JobRecord[];
}): JobSearchHeuristicResult {
  const expandedTokens = expandJobSearchQuery(input.query);
  const scoreById = new Map<string, number>();

  const ranked = input.jobs
    .map((job) => {
      const haystacks = buildJobSearchHaystacks(job);
      let score = 0;

      for (const token of expandedTokens) {
        if (haystacks.title.includes(token)) score += 16;
        else if (haystacks.requirements.includes(token)) score += 11;
        else if (haystacks.responsibilities.includes(token)) score += 9;
        else if (haystacks.aiSummary.includes(token)) score += 8;
        else if (haystacks.overview.includes(token) || haystacks.differentiators.includes(token)) {
          score += 6;
        } else if (haystacks.full.includes(token)) {
          score += 4;
        }
      }

      if (
        expandedTokens.some((token) => ["backend", "coding", "engineer", "engineering"].includes(token))
      ) {
        if (
          haystacks.title.includes("engineer") ||
          haystacks.title.includes("platform") ||
          haystacks.title.includes("full-stack") ||
          haystacks.title.includes("full stack") ||
          haystacks.title.includes("data") ||
          haystacks.title.includes("devops")
        ) {
          score += 18;
        }
      }

      if (job.status === "open") {
        score += 6;
      } else if (job.status === "paused") {
        score += 1;
      }

      scoreById.set(job.id, score);
      return { job, score };
    })
    .sort((left, right) => right.score - left.score)
    .filter((entry) => entry.score > 0);

  const topJobs = ranked.slice(0, 12).map((entry) => entry.job);

  return {
    topJobIds: topJobs.map((job) => job.id),
    summary: buildHeuristicJobSearchSummary(input.query, topJobs),
    scoreById,
  };
}

function getClient() {
  if (!envFlags.hasOpenRouter) {
    return null;
  }

  return new OpenAI({
    apiKey: env.OPENROUTER_API_KEY,
    baseURL: "https://openrouter.ai/api/v1",
  });
}

function withTimeout<T>(promise: Promise<T>, timeoutMs: number) {
  let timeoutId: ReturnType<typeof setTimeout> | undefined;

  const timeout = new Promise<never>((_, reject) => {
    timeoutId = setTimeout(() => {
      reject(new Error(`OpenRouter request timed out after ${timeoutMs}ms.`));
    }, timeoutMs);
  });

  return Promise.race([promise, timeout]).finally(() => {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
  }) as Promise<T>;
}

async function jsonCompletion<T>(
  messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[],
  options?: {
    model?: string;
    temperature?: number;
    timeoutMs?: number;
  },
) {
  const client = getClient();
  if (!client) {
    return null;
  }

  try {
    const result = await withTimeout(
      client.chat.completions.create({
        model: options?.model ?? env.OPENROUTER_MODEL_PRIMARY,
        temperature: options?.temperature ?? 0.25,
        response_format: { type: "json_object" },
        messages,
      }),
      options?.timeoutMs ?? 20_000,
    );

    const content = result.choices[0]?.message?.content ?? "{}";
    return JSON.parse(content) as T;
  } catch (error) {
    console.warn(
      `[openrouter] Structured completion failed: ${
        error instanceof Error ? error.message : String(error)
      }`,
    );
    return null;
  }
}

export async function screenResume(input: {
  job: JobRecord;
  resumeText: string;
  linkedInUrl?: string;
  portfolioUrl?: string;
}): Promise<ScreeningPayload> {
  const fallbackScore = Math.max(
    58,
    Math.min(
      96,
      68 +
        (input.resumeText.includes("AI") ? 7 : 0) +
        (input.resumeText.includes("operations") ? 6 : 0) +
        (input.portfolioUrl ? 4 : 0) +
        (input.linkedInUrl ? 3 : 0),
    ),
  );

  if (!envFlags.hasOpenRouter) {
    return {
      fitScore: fallbackScore,
      rationale:
        "Preview-mode screening based on resume content density, submitted links, and job keyword overlap.",
      strengths: [
        "Resume submitted successfully with structured candidate context.",
        "Relevant public profile signals available for research.",
      ],
      gaps: ["OpenRouter credentials missing, so this is a deterministic preview result."],
      skills: ["Workflow design", "Operations", "AI tooling"],
      yearsExperience: 6,
      education: ["Preview education summary"],
      pastEmployers: ["Preview employer"],
      achievements: ["Preview-mode extraction only"],
    };
  }

  const data = await jsonCompletion<ScreeningPayload>([
    {
      role: "system",
      content: `You are an expert AI recruiter screening candidates for a hiring team. Your task is to evaluate a candidate's resume against a specific job description and produce a structured assessment.

SCORING GUIDELINES:
- 90-100: Exceptional fit. Strong match on requirements, experience level, and domain expertise. Clear evidence of achievements relevant to the role.
- 75-89: Strong fit. Meets most requirements with relevant experience. Minor gaps that can be addressed.
- 60-74: Moderate fit. Meets some requirements but has notable gaps in experience or skills.
- 40-59: Weak fit. Significant gaps between candidate profile and role requirements.
- 0-39: Poor fit. Minimal overlap between candidate experience and role needs.

EXTRACTION RULES:
- Extract EXACT skills mentioned in the resume, not inferred ones
- Count years of experience from employment dates, not claims
- List ALL educational institutions and degrees
- List ALL past employers with approximate tenure
- Identify concrete achievements with metrics where available
- Compare resume claims against the specific job requirements

Return ONLY a JSON object with these fields:
{
  "fitScore": number (0-100),
  "rationale": "2-3 sentence explanation of the score focusing on fit with THIS specific role",
  "strengths": ["strength 1 relevant to the JD", "strength 2", ...],
  "gaps": ["gap 1 compared to JD requirements", "gap 2", ...],
  "skills": ["skill1", "skill2", ...],
  "yearsExperience": number,
  "education": ["Degree from University", ...],
  "pastEmployers": ["Company Name (approx tenure)", ...],
  "achievements": ["Achievement with metrics if available", ...]
}`,
    },
    {
      role: "user",
      content: `## JOB DESCRIPTION
Title: ${input.job.title}
Team: ${input.job.team}
Experience Level: ${input.job.experienceLevel}
Location: ${input.job.location}

Overview: ${input.job.overview}

Responsibilities:
${input.job.responsibilities.map((r) => `- ${r}`).join("\n")}

Requirements:
${input.job.requirements.map((r) => `- ${r}`).join("\n")}

## CANDIDATE RESUME
${input.resumeText}

## ADDITIONAL LINKS
${input.linkedInUrl ? `LinkedIn: ${input.linkedInUrl}` : "No LinkedIn provided"}
${input.portfolioUrl ? `Portfolio: ${input.portfolioUrl}` : "No portfolio provided"}

Evaluate this candidate against the job description above and return the JSON assessment.`,
    },
  ]);

  return (
    data ?? {
      fitScore: fallbackScore,
      rationale: "AI screening returned no structured payload; fallback scoring applied.",
      strengths: ["Fallback scoring path executed."],
      gaps: ["Structured LLM output was unavailable."],
      skills: [],
      yearsExperience: 0,
      education: [],
      pastEmployers: [],
      achievements: [],
    }
  );
}

export async function buildResearchProfile(input: {
  candidateName: string;
  jobTitle: string;
  sourceNotes: string[];
}) {
  if (!envFlags.hasOpenRouter) {
    return {
      candidateBrief:
        `${input.candidateName} has enough public signal to prepare an interviewer quickly, but this is preview-mode synthesis.`,
      githubSummary: "Public engineering signal not yet summarized by OpenRouter.",
      linkedInSummary: "Public career summary not yet synthesized by OpenRouter.",
      xSummary: "No social synthesis available in preview mode.",
      discrepancyFlags: [],
      completeness: "partial" as const,
    };
  }

  const data = await jsonCompletion<ResearchPayload>([
    {
      role: "system",
      content: `You are an AI research assistant building an intelligence profile for a hiring manager. Your goal is to synthesize publicly available information about a candidate into a brief that takes under 60 seconds to read.

RESEARCH TASKS:
1. Analyze LinkedIn data: Cross-reference employment history, skills, and endorsements with the submitted resume
2. Analyze GitHub/portfolio: Summarize notable projects, contributions, languages, and activity level
3. Analyze X/Twitter: Surface relevant posts, opinions, or interests related to the role
4. Flag discrepancies: Note any inconsistencies between resume claims and discovered profiles
5. Generate a 3-5 sentence candidate brief for the hiring manager

Return ONLY a JSON object:
{
  "candidateBrief": "3-5 sentence executive summary a hiring manager can read in 60 seconds",
  "githubSummary": "Summary of GitHub/portfolio activity, projects, and technical contributions",
  "linkedInSummary": "Summary of LinkedIn profile, employment history consistency, and professional network",
  "xSummary": "Summary of X/Twitter presence, relevant posts, and public opinions related to the role",
  "discrepancyFlags": ["Any inconsistency between resume and online profiles"],
  "completeness": "complete" or "partial"
}`,
    },
    {
      role: "user",
      content: `Candidate: ${input.candidateName}
Role: ${input.jobTitle}

Source information gathered:
${input.sourceNotes.map((note) => `- ${note}`).join("\n")}

Synthesize this information into a structured research profile.`,
    },
  ], {
    timeoutMs: 15_000,
  });

  return (
    data ?? {
      candidateBrief: "Research synthesis failed, but the source notes were collected successfully.",
      githubSummary: "Unavailable",
      linkedInSummary: "Unavailable",
      xSummary: "Unavailable",
      discrepancyFlags: ["OpenRouter returned invalid research payload."],
      completeness: "partial" as const,
    }
  );
}

export async function rankJobsForCandidateSearch(input: {
  query: string;
  jobs: JobRecord[];
}): Promise<JobSearchPayload | null> {
  if (input.jobs.length === 0) {
    return null;
  }

  const heuristic = buildHeuristicJobSearchRanking(input);

  if (!envFlags.hasOpenRouter) {
    return {
      topJobIds: heuristic.topJobIds,
      summary: heuristic.summary,
    };
  }

  const data = await jsonCompletion<JobSearchPayload>([
    {
      role: "system",
      content: `You are an expert recruiting copilot ranking job openings for a candidate. Your job is to recommend the most relevant roles based on the candidate's stated skills, domain experience, goals, work preferences, and compensation expectations.

Return ONLY JSON with:
{
  "topJobIds": ["job id 1", "job id 2", "..."],
  "summary": "one short sentence explaining why the strongest jobs fit"
}

Rules:
- Only use job IDs from the provided list.
- Return between 3 and 12 job IDs, ordered best to worst.
- Rank by actual fit, not superficial keyword overlap.
- Weight title fit, day-to-day scope, requirements, seniority, location, remote policy, compensation, and domain overlap.
- If the candidate states a hard preference like remote-only, location, salary floor, or job family, treat that as high priority.
- Prefer "open" roles over "paused" roles when fit is otherwise similar.
- Avoid recommending roles that clearly mismatch the candidate's seniority or functional background.
- Use the overview, responsibilities, requirements, differentiators, and AI leverage summary together when ranking.
- Do not invent jobs.`,
    },
    {
      role: "user",
      content: `Candidate search:
${input.query}

Jobs:
${input.jobs
  .map(
    (job) => `- ${job.id}
Status: ${job.status}
Title: ${job.title}
Team: ${job.team}
Location: ${job.location}
Remote: ${job.remoteLabel}
Level: ${job.experienceLevel}
Compensation: ${job.compensationBand}
Overview: ${job.overview}
Responsibilities: ${job.responsibilities.join("; ")}
Requirements: ${job.requirements.join("; ")}
Differentiators: ${job.differentiators.join("; ")}
AI Leverage Summary: ${job.aiLeverageSummary || "Not specified"}`,
  )
  .join("\n\n")}`,
    },
  ], {
    model: env.OPENROUTER_MODEL_FAST,
    temperature: 0.1,
    timeoutMs: 8_000,
  });

  const aiIds = uniqueTokens(
    (data?.topJobIds ?? []).filter((jobId) => input.jobs.some((job) => job.id === jobId)),
  );

  if (aiIds.length === 0) {
    return {
      topJobIds: heuristic.topJobIds,
      summary: data?.summary ?? heuristic.summary,
    };
  }

  const aiOrder = new Map(aiIds.map((id, index) => [id, index]));
  const merged = [...input.jobs]
    .map((job) => ({
      id: job.id,
      score:
        (heuristic.scoreById.get(job.id) ?? 0) +
        (aiOrder.has(job.id) ? 120 - aiOrder.get(job.id)! * 8 : 0),
    }))
    .filter((entry) => entry.score > 0)
    .sort((left, right) => right.score - left.score)
    .slice(0, 12)
    .map((entry) => entry.id);

  return {
    topJobIds: merged,
    summary: data?.summary ?? heuristic.summary,
  };
}

export async function proposeCandidateRescheduleOption(input: {
  candidateName: string;
  jobTitle: string;
  rescheduleNotes?: string;
  slotOptions: Array<{ startsAt: string; label: string }>;
}): Promise<CandidateRescheduleSuggestionPayload> {
  const fallbackSlot = input.slotOptions[0];
  const fallbackMessage = fallbackSlot
    ? `The interviewer could not accommodate the earlier request, but this next available option is open on their calendar. Does ${fallbackSlot.label} work for you?`
    : "The interviewer could not accommodate the earlier request. Please review the next available option.";

  if (!fallbackSlot || !envFlags.hasOpenRouter) {
    return {
      startsAt: fallbackSlot?.startsAt ?? "",
      message: fallbackMessage,
    };
  }

  const data = await jsonCompletion<CandidateRescheduleSuggestionPayload>([
    {
      role: "system",
      content: `You help a recruiting scheduler propose exactly one replacement interview time after the interviewer declined a previous request.

Return ONLY JSON:
{
  "startsAt": "one of the provided startsAt values exactly",
  "message": "1-2 concise sentences for the candidate explaining that the interviewer declined the prior request and asking whether this replacement time works"
}

Rules:
- You must choose exactly one startsAt from the provided options.
- Prefer the slot that best matches the candidate's note if one is available.
- Keep the message concise, professional, and candidate-facing.
- Do not mention internal system details.`,
    },
    {
      role: "user",
      content: `Candidate: ${input.candidateName}
Role: ${input.jobTitle}
Candidate note: ${input.rescheduleNotes?.trim() || "No specific note provided."}

Available replacement options:
${input.slotOptions.map((slot) => `- ${slot.startsAt} | ${slot.label}`).join("\n")}

Choose the single best option and write the message.`,
    },
  ], {
    model: env.OPENROUTER_MODEL_FAST,
    temperature: 0.2,
    timeoutMs: 8_000,
  });

  const matchedSlot = input.slotOptions.find((slot) => slot.startsAt === data?.startsAt) ?? fallbackSlot;

  return {
    startsAt: matchedSlot.startsAt,
    message:
      data?.message?.trim() ||
      `The interviewer could not accommodate the earlier request, but ${matchedSlot.label} is available. Does this time work for you?`,
  };
}

export async function draftOfferLetter(input: {
  candidateName: string;
  jobTitle: string;
  startDate: string;
  baseSalary: number;
  bonus: string;
  equity: string;
  managerName: string;
  managerGreeting: string;
  customTerms: string;
  candidateHeadline?: string;
  candidateLocation?: string;
  team?: string;
  jobOverview?: string;
}) {
  const fallback: OfferLetterPayload = {
    openingParagraph: `Niural is pleased to extend an offer to ${input.candidateName} for the role of ${input.jobTitle}, with an anticipated start date of ${input.startDate}.`,
    roleParagraph: `${input.candidateName} will report to ${input.managerName} and join the team with clear ownership expectations, strong cross-functional partnership, and a focus on high-judgment execution.`,
    compensationParagraph: `This role carries a base salary of $${input.baseSalary.toLocaleString()} annually, plus ${input.bonus} and ${input.equity}.`,
    termsParagraph: input.customTerms,
    managerNote: input.managerGreeting,
    closingParagraph:
      "This offer remains subject to final internal approvals, standard employment documentation, and completion of the DocuSign signature workflow.",
  };

  if (!envFlags.hasOpenRouter) {
    return fallback;
  }

  const data = await jsonCompletion<OfferLetterPayload>([
    {
      role: "system",
      content: `You draft professional employment offer letters for a hiring team.

Return ONLY JSON:
{
  "openingParagraph": "formal opening paragraph",
  "roleParagraph": "paragraph summarizing the role, reporting line, and expectations",
  "compensationParagraph": "paragraph summarizing salary, bonus, and equity professionally",
  "termsParagraph": "paragraph describing candidate-specific terms and conditions in polished language",
  "managerNote": "warm but professional manager note",
  "closingParagraph": "formal closing paragraph ready for signature routing"
}

Rules:
- Write formal, polished business English suitable for executive review.
- Use the provided manager inputs faithfully.
- Do not invent legal clauses that were not provided.
- Keep each paragraph concise but substantial.
- Avoid bullet lists; write narrative offer-letter paragraphs.
- Never mention AI or internal system behavior.`,
    },
    {
      role: "user",
      content: JSON.stringify(input),
    },
  ], {
    timeoutMs: 15_000,
  });

  return {
    openingParagraph: data?.openingParagraph?.trim() || fallback.openingParagraph,
    roleParagraph: data?.roleParagraph?.trim() || fallback.roleParagraph,
    compensationParagraph:
      data?.compensationParagraph?.trim() || fallback.compensationParagraph,
    termsParagraph: data?.termsParagraph?.trim() || fallback.termsParagraph,
    managerNote: data?.managerNote?.trim() || fallback.managerNote,
    closingParagraph: data?.closingParagraph?.trim() || fallback.closingParagraph,
  };
}

export async function analyzeInterviewConversation(input: {
  candidateName: string;
  jobTitle: string;
  conversation: Array<{ speaker: string; text: string }>;
}) {
  const transcriptText = input.conversation
    .map((turn) => `${turn.speaker}: ${turn.text}`)
    .join("\n");

  if (!transcriptText.trim()) {
    throw new Error("Interview conversation is empty.");
  }

  if (!envFlags.hasOpenRouter) {
    const candidateTurns = input.conversation
      .filter((turn) => turn.speaker.toLowerCase().includes("interviewee"))
      .map((turn) => turn.text.toLowerCase());
    const positiveSignals = ["built", "led", "shipped", "improved", "launched", "owned"];
    const hitCount = candidateTurns.reduce((count, turn) => {
      return count + positiveSignals.filter((signal) => turn.includes(signal)).length;
    }, 0);
    const decision = hitCount >= 3 ? "selected" : "rejected";

    return {
      decision,
      summary:
        decision === "selected"
          ? `${input.candidateName} demonstrated enough relevant experience to move forward for ${input.jobTitle}.`
          : `${input.candidateName} did not show enough evidence to move forward for ${input.jobTitle}.`,
      rationale:
        decision === "selected"
          ? "Preview-mode analysis found several concrete delivery and ownership signals in the interview answers."
          : "Preview-mode analysis did not find enough concrete evidence of scope, ownership, and role fit.",
      strengths:
        decision === "selected"
          ? ["Concrete examples of shipped work", "Clear ownership language during the interview"]
          : ["Candidate engaged professionally during the conversation"],
      concerns:
        decision === "selected"
          ? ["Manual review is still recommended because this was a fallback path."]
          : ["Fallback analysis did not find enough role-specific evidence."],
      followUpNotes:
        decision === "selected"
          ? ["Validate compensation expectations before sending the final offer."]
          : ["Share a concise rejection note with the candidate after internal review."],
      managerGreeting: "We are excited about the clarity and ownership you showed during the interview.",
      customTerms:
        "This draft is based on the interview assessment and remains subject to final compensation and compliance review.",
    } satisfies InterviewAnalysisPayload;
  }

  const data = await jsonCompletion<InterviewAnalysisPayload>([
    {
      role: "system",
      content: `You are a senior hiring panel reviewer. Analyze an interview transcript and return ONLY JSON.

Return this exact shape:
{
  "decision": "selected" or "rejected",
  "summary": "2-4 sentence executive summary of the interview",
  "rationale": "1-3 sentence explanation for the hiring decision",
  "strengths": ["3-5 concrete strengths grounded in the transcript"],
  "concerns": ["2-5 concrete concerns or risks grounded in the transcript"],
  "followUpNotes": ["practical next steps for the hiring team"],
  "managerGreeting": "one short sentence suitable for an offer draft if selected",
  "customTerms": "one short paragraph of tailored, non-legal custom offer context if selected; otherwise write a brief internal-only note"
}

Rules:
- Decide whether the candidate should move forward or be rejected.
- Base the answer only on the transcript and role context.
- Be decisive and specific.
- Cite evidence in plain language inside the summary and rationale, but do not quote long transcript passages.
- If the candidate is rejected, the managerGreeting and customTerms must still be non-empty strings, but they can be conservative placeholders for internal drafting.
- Never mention OpenRouter, AI, or hidden system behavior.`,
    },
    {
      role: "user",
      content: `Candidate: ${input.candidateName}
Role: ${input.jobTitle}

Transcript:
${transcriptText}`,
    },
  ], {
    timeoutMs: 20_000,
  });

  if (!data) {
    throw new Error("OpenRouter did not return interview analysis.");
  }

  return {
    decision: data.decision === "selected" ? "selected" : "rejected",
    summary: data.summary?.trim() || `${input.candidateName} interview analysis is available.`,
    rationale: data.rationale?.trim() || "The interview transcript was analyzed.",
    strengths: Array.isArray(data.strengths) ? data.strengths.filter(Boolean).slice(0, 5) : [],
    concerns: Array.isArray(data.concerns) ? data.concerns.filter(Boolean).slice(0, 5) : [],
    followUpNotes: Array.isArray(data.followUpNotes)
      ? data.followUpNotes.filter(Boolean).slice(0, 5)
      : [],
    managerGreeting:
      data.managerGreeting?.trim() || "We are excited about the contribution you can make at Niural.",
    customTerms:
      data.customTerms?.trim() ||
      "Final offer details remain subject to compensation and compliance review.",
  } satisfies InterviewAnalysisPayload;
}

export async function composeSlackWelcome(input: {
  candidateName: string;
  roleTitle: string;
  startDate: string;
  managerGreeting: string;
  managerName?: string;
  team?: string;
  candidateHeadline?: string;
  candidateLocation?: string;
  resourceUrl?: string;
}) {
  if (!envFlags.hasOpenRouter) {
    return `Welcome to ${input.team ? `${input.team} at ` : ""}Niural, ${input.candidateName}. You're joining as ${input.roleTitle} and starting on ${input.startDate}. ${input.managerGreeting}${input.resourceUrl ? ` Your onboarding guide is here: ${input.resourceUrl}` : ""}`;
  }

  const client = getClient();
  try {
    const result = await withTimeout(
      client!.chat.completions.create({
        model: env.OPENROUTER_MODEL_FAST,
        temperature: 0.55,
        messages: [
          {
            role: "system",
            content:
              "Write a warm, concise, personalized Slack welcome message for a new employee joining a company workspace. The message must feel human, not templated. Mention their name, role, start date, a short greeting from their manager, and the onboarding resource link if one is provided. Use details from the candidate profile context when available, but do not invent facts. Keep it under 120 words and suitable for a Slackbot DM.",
          },
          {
            role: "user",
            content: JSON.stringify(input),
          },
        ],
      }),
      8_000,
    );

    return result.choices[0]?.message?.content ?? "";
  } catch (error) {
    console.warn(
      `[openrouter] Slack welcome generation failed: ${
        error instanceof Error ? error.message : String(error)
      }`,
    );
    return `Welcome to ${input.team ? `${input.team} at ` : ""}Niural, ${input.candidateName}. You're joining as ${input.roleTitle} and starting on ${input.startDate}. ${input.managerGreeting}${input.resourceUrl ? ` Your onboarding guide is here: ${input.resourceUrl}` : ""}`;
  }
}

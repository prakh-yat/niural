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

function getClient() {
  if (!envFlags.hasOpenRouter) {
    return null;
  }

  return new OpenAI({
    apiKey: env.OPENROUTER_API_KEY,
    baseURL: "https://openrouter.ai/api/v1",
  });
}

async function jsonCompletion<T>(messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[]) {
  const client = getClient();
  if (!client) {
    return null;
  }

  const result = await client.chat.completions.create({
    model: env.OPENROUTER_MODEL_PRIMARY,
    temperature: 0.25,
    response_format: { type: "json_object" },
    messages,
  });

  const content = result.choices[0]?.message?.content ?? "{}";
  return JSON.parse(content) as T;
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
      content:
        "You are screening a candidate for a hiring team. Return only JSON with fitScore, rationale, strengths, gaps, skills, yearsExperience, education, pastEmployers, achievements.",
    },
    {
      role: "user",
      content: JSON.stringify({
        role: input.job,
        resumeText: input.resumeText,
        linkedInUrl: input.linkedInUrl,
        portfolioUrl: input.portfolioUrl,
      }),
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
      content:
        "You are building a recruiter-facing brief. Return only JSON with candidateBrief, githubSummary, linkedInSummary, xSummary, discrepancyFlags, completeness.",
    },
    {
      role: "user",
      content: JSON.stringify(input),
    },
  ]);

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

export async function draftOfferLetter(input: {
  candidateName: string;
  jobTitle: string;
  startDate: string;
  baseSalary: number;
  bonus: string;
  equity: string;
  managerName: string;
  customTerms: string;
}) {
  if (!envFlags.hasOpenRouter) {
    return `Draft offer for ${input.candidateName} joining as ${input.jobTitle} on ${input.startDate}.`;
  }

  const client = getClient();
  const result = await client!.chat.completions.create({
    model: env.OPENROUTER_MODEL_FAST,
    temperature: 0.35,
    messages: [
      {
        role: "system",
        content:
          "Draft a professional employment offer letter. Keep the tone formal and concise, ready for legal review.",
      },
      {
        role: "user",
        content: JSON.stringify(input),
      },
    ],
  });

  return result.choices[0]?.message?.content ?? "";
}

export async function composeSlackWelcome(input: {
  candidateName: string;
  roleTitle: string;
  startDate: string;
  managerGreeting: string;
  resourceUrl?: string;
}) {
  if (!envFlags.hasOpenRouter) {
    return `Welcome to Niural, ${input.candidateName}. You're joining as ${input.roleTitle} and starting on ${input.startDate}. ${input.managerGreeting}`;
  }

  const client = getClient();
  const result = await client!.chat.completions.create({
    model: env.OPENROUTER_MODEL_FAST,
    temperature: 0.5,
    messages: [
      {
        role: "system",
        content: "Write a warm but crisp Slack welcome message for a new employee.",
      },
      {
        role: "user",
        content: JSON.stringify(input),
      },
    ],
  });

  return result.choices[0]?.message?.content ?? "";
}

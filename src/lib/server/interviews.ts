import "server-only";

import { Prisma } from "@prisma/client";

import { analyzeInterviewConversation } from "@/lib/integrations/openrouter";
import { prisma } from "@/lib/prisma";
import { createOfferDraft } from "@/lib/server/applications";
import { withDatabaseFallback } from "@/lib/server/database";
import { sendTrackedEmail } from "@/lib/server/email";
import { updateApplicationStage } from "@/lib/server/pipeline";
import { recordIntegrationEvent } from "@/lib/server/workflows";

type ConversationTurn = {
  key: string;
  speaker: string;
  text: string;
};

type AnalyzeInterviewTranscriptResult = {
  mode: "preview" | "live";
  applicationId: string;
  interviewId: string;
  decision: "selected" | "rejected";
  offerId?: string;
  summary: string;
};

type InterviewAnalysisApplication = {
  id: string;
  candidateId: string;
  fullName: string;
  roleSelectionSnapshot: string;
  candidate: {
    managerGreeting: string | null;
  };
};

function normalizeSpeakerName(key: string) {
  if (key.toLowerCase().startsWith("interviewer")) {
    return "Interviewer";
  }

  if (
    key.toLowerCase().startsWith("interviewee") ||
    key.toLowerCase().startsWith("candidate")
  ) {
    return "Candidate";
  }

  return key.replace(/\d+$/u, "").trim() || key;
}

function normalizeConversation(input: unknown): ConversationTurn[] {
  if (Array.isArray(input)) {
    return input.flatMap((entry, index) => {
      if (!entry || typeof entry !== "object" || Array.isArray(entry)) {
        return [];
      }

      const record = entry as Record<string, unknown>;
      const text = typeof record.text === "string" ? record.text.trim() : "";
      if (!text) {
        return [];
      }

      const rawSpeaker =
        typeof record.speaker === "string" ? record.speaker.trim() : `speaker${index + 1}`;

      return [
        {
          key: rawSpeaker || `speaker${index + 1}`,
          speaker: normalizeSpeakerName(rawSpeaker || `speaker${index + 1}`),
          text,
        },
      ];
    });
  }

  if (!input || typeof input !== "object" || Array.isArray(input)) {
    return [];
  }

  return Object.entries(input as Record<string, unknown>).flatMap(([key, value]) => {
    const text = typeof value === "string" ? value.trim() : "";
    if (!text) {
      return [];
    }

    return [
      {
        key,
        speaker: normalizeSpeakerName(key),
        text,
      },
    ];
  });
}

function buildTranscriptText(turns: ConversationTurn[]) {
  return turns.map((turn) => `${turn.speaker}: ${turn.text}`).join("\n\n");
}

function resolveConnectedInterviewerMetadata(
  metadata: Prisma.JsonValue | null | undefined,
) {
  if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) {
    return null;
  }

  return metadata as Record<string, unknown>;
}

async function resolveApplicationContext(input: {
  applicationId?: string;
  interviewId?: string;
}) {
  if (input.interviewId) {
    const interview = await prisma.interview.findUnique({
      where: { id: input.interviewId },
      include: {
        application: {
          include: {
            candidate: true,
          },
        },
      },
    });

    if (!interview) {
      throw new Error("Interview not found.");
    }

    return {
      application: interview.application,
      interview,
    };
  }

  if (!input.applicationId) {
    throw new Error("applicationId or interviewId is required.");
  }

  const application = await prisma.application.findUnique({
    where: { id: input.applicationId },
    include: {
      candidate: true,
      interviews: {
        orderBy: { createdAt: "desc" },
        take: 1,
      },
    },
  });

  if (!application) {
    throw new Error("Application not found.");
  }

  const latestInterview = application.interviews[0] ?? null;
  return {
    application,
    interview: latestInterview,
  };
}

async function ensureInterviewRecord(input: {
  application: InterviewAnalysisApplication;
  existingInterviewId?: string | null;
}) {
  if (input.existingInterviewId) {
    return prisma.interview.update({
      where: { id: input.existingInterviewId },
      data: {
        status: "completed",
      },
    });
  }

  const calendarCredential = await prisma.integrationCredential.findUnique({
    where: {
      provider_lookupKey: {
        provider: "google_calendar",
        lookupKey: "primary_interviewer",
      },
    },
    select: {
      metadata: true,
    },
  });
  const metadata = resolveConnectedInterviewerMetadata(calendarCredential?.metadata);
  const interviewerEmail =
    (typeof metadata?.email === "string" && metadata.email) || "interviewer@local.niural";
  const interviewerName =
    (typeof metadata?.name === "string" && metadata.name) ||
    interviewerEmail.split("@")[0] ||
    "Interviewer";

  return prisma.interview.create({
    data: {
      applicationId: input.application.id,
      interviewerEmail,
      interviewerName,
      status: "completed",
      confirmedAt: new Date(),
    },
  });
}

export async function analyzeInterviewTranscriptSubmission(input: {
  applicationId?: string;
  interviewId?: string;
  conversation: unknown;
}): Promise<AnalyzeInterviewTranscriptResult> {
  return withDatabaseFallback<AnalyzeInterviewTranscriptResult>(async () => {
    const turns = normalizeConversation(input.conversation);
    if (turns.length === 0) {
      throw new Error("Conversation JSON must contain at least one transcript turn.");
    }

    const { application, interview } = await resolveApplicationContext(input);
    const ensuredInterview = await ensureInterviewRecord({
      application,
      existingInterviewId: interview?.id ?? null,
    });

    const analysis = await analyzeInterviewConversation({
      candidateName: application.fullName,
      jobTitle: application.roleSelectionSnapshot,
      conversation: turns.map((turn) => ({
        speaker: turn.speaker,
        text: turn.text,
      })),
    });

    await prisma.transcriptArtifact.upsert({
      where: { interviewId: ensuredInterview.id },
      update: {
        provider: "manual_json",
        providerMeetingId: null,
        summary: `${analysis.summary}\n\nDecision rationale: ${analysis.rationale}`,
        transcript: buildTranscriptText(turns),
        transcriptJson: {
          source: "manual_json",
          submittedAt: new Date().toISOString(),
          turns,
          analysis,
        },
      },
      create: {
        interviewId: ensuredInterview.id,
        provider: "manual_json",
        summary: `${analysis.summary}\n\nDecision rationale: ${analysis.rationale}`,
        transcript: buildTranscriptText(turns),
        transcriptJson: {
          source: "manual_json",
          submittedAt: new Date().toISOString(),
          turns,
          analysis,
        },
      },
    });

    await prisma.interview.update({
      where: { id: ensuredInterview.id },
      data: {
        status: "completed",
      },
    });

    let offerId: string | undefined;

    if (analysis.decision === "selected") {
      const offer = await createOfferDraft({
        applicationId: application.id,
        overrides: {
          managerGreeting: analysis.managerGreeting,
          customTerms: analysis.customTerms,
        },
      });
      offerId = offer.offerId;
    } else {
      await prisma.offerDraft.updateMany({
        where: {
          applicationId: application.id,
          status: "draft",
        },
        data: {
          status: "voided",
        },
      });

      await updateApplicationStage({
        applicationId: application.id,
        stage: "rejected",
        note: `Interview review completed. ${analysis.rationale}`,
        actor: "ai",
        visibility: "admin",
      });

      await sendTrackedEmail({
        to: application.email,
        subject: "Update on your Niural interview",
        html: `<p>Hi ${application.fullName},</p><p>Thank you for taking the time to interview with Niural for the ${application.roleSelectionSnapshot} role.</p><p>After reviewing the interview, we will not be moving forward with this application. We appreciate the time and effort you invested in the process and wish you the best in your search.</p><p>Niural Talent Team</p>`,
        text: `Hi ${application.fullName},\n\nThank you for taking the time to interview with Niural for the ${application.roleSelectionSnapshot} role.\n\nAfter reviewing the interview, we will not be moving forward with this application. We appreciate the time and effort you invested in the process and wish you the best in your search.\n\nNiural Talent Team`,
        eventType: "interview.rejection_email",
        payload: {
          applicationId: application.id,
          interviewId: ensuredInterview.id,
          recipientRole: "candidate",
        },
      });
    }

    await recordIntegrationEvent("openrouter", "interview.analysis", "success", {
      applicationId: application.id,
      interviewId: ensuredInterview.id,
      decision: analysis.decision,
      summary: analysis.summary,
    });

    return {
      mode: "live" as const,
      applicationId: application.id,
      interviewId: ensuredInterview.id,
      decision: analysis.decision,
      offerId,
      summary: analysis.summary,
    };
  }, () => ({
    mode: "preview" as const,
    applicationId: input.applicationId ?? "preview-application",
    interviewId: input.interviewId ?? "preview-interview",
    decision: "selected",
    offerId: "preview-offer",
    summary: "Preview mode interview analysis completed.",
  }));
}

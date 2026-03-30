import "server-only";

import type { ApplicationStageKey } from "@/lib/domain";
import { prisma } from "@/lib/prisma";

type StatusHistoryEntry = {
  stage: string;
  at: string;
  note: string;
  actor?: "ai" | "admin" | "candidate" | "system";
  visibility?: "public" | "admin";
};

export async function updateApplicationStage(input: {
  applicationId: string;
  stage: ApplicationStageKey;
  note: string;
  actor?: "admin" | "ai" | "candidate" | "system";
  visibility?: "public" | "admin";
}) {
  const application = await prisma.application.findUnique({
    where: { id: input.applicationId },
    select: {
      id: true,
      statusHistory: true,
    },
  });

  if (!application) {
    throw new Error("Application not found.");
  }

  const currentHistory = Array.isArray(application.statusHistory)
    ? (application.statusHistory as StatusHistoryEntry[])
    : [];

  await prisma.application.update({
    where: { id: input.applicationId },
    data: {
      stage: input.stage,
      stageReason:
        input.actor === "admin"
          ? `Manually moved to ${input.stage.replaceAll("_", " ")} by admin review.`
          : input.note,
      statusHistory: [
        ...currentHistory,
        {
          stage: input.stage,
          at: new Date().toISOString(),
          note: input.note,
          actor: input.actor ?? "admin",
          visibility: input.visibility ?? "admin",
        },
      ],
    },
  });
}

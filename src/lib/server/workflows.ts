import { Prisma } from "@prisma/client";

import { env, envFlags } from "@/lib/env";
import { prisma } from "@/lib/prisma";

export async function ensureWorkflowJob(kind: string, payload: Record<string, unknown>) {
  if (!envFlags.hasDatabase) {
    return null;
  }

  return prisma.workflowJob.create({
    data: {
      kind,
      payload: payload as Prisma.InputJsonValue,
    },
  });
}

export async function recordIntegrationEvent(
  provider:
    | "openrouter"
    | "resend"
    | "google_calendar"
    | "fireflies"
    | "docusign"
    | "slack"
    | "serper",
  eventType: string,
  status: string,
  payload: Record<string, unknown>,
  dedupeKey?: string,
) {
  if (!envFlags.hasDatabase) {
    return null;
  }

  return prisma.integrationEvent.create({
    data: {
      provider,
      eventType,
      status,
      payload: payload as Prisma.InputJsonValue,
      dedupeKey,
    },
  });
}

export async function upsertGoogleRefreshToken(refreshToken: string) {
  if (!envFlags.hasDatabase) {
    return null;
  }

  return prisma.integrationCredential.upsert({
    where: {
      provider_lookupKey: {
        provider: "google_calendar",
        lookupKey: "primary_interviewer",
      },
    },
    update: { refreshToken },
    create: {
      provider: "google_calendar",
      lookupKey: "primary_interviewer",
      refreshToken,
    },
  });
}

export async function createOneTimeMagicLinkPlaceholder(
  email: string,
  role: string,
  path: string,
) {
  return `${env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"}/auth/sign-in?role=${role}&next=${encodeURIComponent(
    path,
  )}&email=${encodeURIComponent(email)}`;
}

import { Prisma } from "@prisma/client";

import { env } from "@/lib/env";
import { buildAdminUrl, buildAppUrl } from "@/lib/portal";
import { prisma } from "@/lib/prisma";
import { withDatabaseFallback } from "@/lib/server/database";

export async function ensureWorkflowJob(kind: string, payload: Record<string, unknown>) {
  return withDatabaseFallback(
    async () =>
      prisma.workflowJob.create({
        data: {
          kind,
          payload: payload as Prisma.InputJsonValue,
        },
      }),
    () => null,
  );
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
  return withDatabaseFallback(
    async () => {
      if (dedupeKey) {
        return prisma.integrationEvent.upsert({
          where: { dedupeKey },
          update: {
            provider,
            eventType,
            status,
            payload: payload as Prisma.InputJsonValue,
          },
          create: {
            provider,
            eventType,
            status,
            payload: payload as Prisma.InputJsonValue,
            dedupeKey,
          },
        });
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
    },
    () => null,
  );
}

export async function findIntegrationEventByDedupeKey(dedupeKey: string) {
  return withDatabaseFallback(
    async () =>
      prisma.integrationEvent.findUnique({
        where: { dedupeKey },
      }),
    () => null,
  );
}

export async function upsertGoogleRefreshToken(input: {
  refreshToken: string;
  accessToken?: string | null;
  metadata?: Record<string, unknown>;
}) {
  return withDatabaseFallback(
    async () =>
      prisma.integrationCredential.upsert({
        where: {
          provider_lookupKey: {
            provider: "google_calendar",
            lookupKey: "primary_interviewer",
          },
        },
        update: {
          refreshToken: input.refreshToken,
          accessToken: input.accessToken ?? undefined,
          metadata: input.metadata as Prisma.InputJsonValue | undefined,
        },
        create: {
          provider: "google_calendar",
          lookupKey: "primary_interviewer",
          refreshToken: input.refreshToken,
          accessToken: input.accessToken ?? undefined,
          metadata: input.metadata as Prisma.InputJsonValue | undefined,
        },
      }),
    () => null,
  );
}

export async function createOneTimeMagicLinkPlaceholder(
  email: string,
  role: string,
  path: string,
  baseUrl?: string,
) {
  const targetBaseUrl = baseUrl ?? env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  const portalPath = role === "candidate" ? buildAppUrl(path) : buildAdminUrl(path);
  const signInUrl = new URL(`${targetBaseUrl}/auth/sign-in`);

  signInUrl.searchParams.set("role", role);
  signInUrl.searchParams.set("next", portalPath);
  signInUrl.searchParams.set("email", email);

  return signInUrl.toString();
}

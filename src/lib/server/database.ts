import "server-only";

import { Prisma } from "@prisma/client";

import { envFlags } from "@/lib/env";

const DATABASE_ERROR_CODES = new Set(["P1000", "P1001", "P1002", "P1008", "P1017"]);
const DATABASE_ERROR_MESSAGES = [
  "tenant or user not found",
  "can't reach database server",
  "authentication failed against database server",
  "server has closed the connection",
  "connection error",
  "connection refused",
  "timed out",
];

let databaseUnavailableReason: string | null = null;

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : String(error);
}

export function isRecoverableDatabaseError(error: unknown) {
  if (error instanceof Prisma.PrismaClientInitializationError) {
    return true;
  }

  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    return DATABASE_ERROR_CODES.has(error.code);
  }

  if (error instanceof Prisma.PrismaClientUnknownRequestError) {
    const message = getErrorMessage(error).toLowerCase();
    return DATABASE_ERROR_MESSAGES.some((fragment) => message.includes(fragment));
  }

  const message = getErrorMessage(error).toLowerCase();
  return DATABASE_ERROR_MESSAGES.some((fragment) => message.includes(fragment));
}

function rememberDatabaseFailure(error: unknown) {
  if (databaseUnavailableReason) {
    return;
  }

  databaseUnavailableReason = getErrorMessage(error);
  console.warn(
    `[database] Database unavailable. Using non-persistent fallback responses until the process restarts: ${databaseUnavailableReason}`,
  );
}

export function canUseDatabase() {
  return envFlags.hasDatabase && !databaseUnavailableReason;
}

export async function withDatabaseFallback<T>(
  operation: () => Promise<T>,
  fallback: () => T | Promise<T>,
): Promise<T> {
  if (!canUseDatabase()) {
    return await fallback();
  }

  try {
    return await operation();
  } catch (error) {
    if (!isRecoverableDatabaseError(error)) {
      throw error;
    }

    rememberDatabaseFailure(error);
    return await fallback();
  }
}

export function getDatabaseUnavailableMessage(
  message = "The database is temporarily unavailable. Please try again in a minute.",
) {
  return message;
}

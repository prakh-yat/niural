import "server-only";

import { env } from "@/lib/env";
import { prisma } from "@/lib/prisma";
import { createSupabaseAdminClient } from "@/lib/server/auth";
import { withDatabaseFallback } from "@/lib/server/database";

export type CandidateProfileMetadata = {
  savedJobIds: string[];
  skills: string[];
  desiredSalaryMin?: number;
  desiredSalaryMax?: number;
  avatarPath?: string;
  avatarDataUrl?: string;
};

export type CandidateProfileSettings = {
  fullName: string;
  headline: string;
  preferredLocation: string;
  skills: string[];
  savedJobIds: string[];
  desiredSalaryMin?: number;
  desiredSalaryMax?: number;
  avatarPath?: string;
  avatarUrl?: string;
  applicationInterests: string[];
};

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

export function uniqueCandidateStrings(values: string[]) {
  return Array.from(new Set(values.map((value) => value.trim()).filter(Boolean)));
}

export function readCandidateProfileMetadata(value: unknown): CandidateProfileMetadata {
  const record = asRecord(value);
  const savedJobIds = Array.isArray(record.savedJobIds)
    ? uniqueCandidateStrings(
        record.savedJobIds.filter((item): item is string => typeof item === "string"),
      )
    : [];
  const skills = Array.isArray(record.skills)
    ? uniqueCandidateStrings(record.skills.filter((item): item is string => typeof item === "string"))
    : [];

  return {
    savedJobIds,
    skills,
    desiredSalaryMin:
      typeof record.desiredSalaryMin === "number" ? record.desiredSalaryMin : undefined,
    desiredSalaryMax:
      typeof record.desiredSalaryMax === "number" ? record.desiredSalaryMax : undefined,
    avatarPath: typeof record.avatarPath === "string" ? record.avatarPath : undefined,
    avatarDataUrl: typeof record.avatarDataUrl === "string" ? record.avatarDataUrl : undefined,
  };
}

export function buildCandidateProfileMetadata(metadata: CandidateProfileMetadata) {
  return {
    savedJobIds: metadata.savedJobIds,
    skills: metadata.skills,
    ...(metadata.desiredSalaryMin ? { desiredSalaryMin: metadata.desiredSalaryMin } : {}),
    ...(metadata.desiredSalaryMax ? { desiredSalaryMax: metadata.desiredSalaryMax } : {}),
    ...(metadata.avatarPath ? { avatarPath: metadata.avatarPath } : {}),
    ...(metadata.avatarDataUrl ? { avatarDataUrl: metadata.avatarDataUrl } : {}),
  };
}

export async function resolveCandidateAvatarUrl(metadata: CandidateProfileMetadata) {
  if (metadata.avatarDataUrl) {
    return metadata.avatarDataUrl;
  }

  if (!metadata.avatarPath || metadata.avatarPath.startsWith("local/")) {
    return undefined;
  }

  const admin = createSupabaseAdminClient();
  if (!admin) {
    return undefined;
  }

  try {
    const { data, error } = await admin.storage
      .from(env.SUPABASE_STORAGE_BUCKET)
      .createSignedUrl(metadata.avatarPath, 60 * 60);

    if (error) {
      return undefined;
    }

    return data.signedUrl;
  } catch {
    return undefined;
  }
}

async function uploadCandidateAvatar(file: File) {
  const allowedTypes = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);

  if (!allowedTypes.has(file.type)) {
    throw new Error("Upload a PNG, JPG, WEBP, or GIF profile image.");
  }

  if (file.size > 2 * 1024 * 1024) {
    throw new Error("Profile image must be 2MB or smaller.");
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const admin = createSupabaseAdminClient();

  if (admin) {
    const safeName = file.name.replace(/[^a-zA-Z0-9.-]/g, "-");
    const path = `avatars/${Date.now()}-${safeName}`;

    try {
      const { error } = await admin.storage.from(env.SUPABASE_STORAGE_BUCKET).upload(path, buffer, {
        contentType: file.type,
        upsert: true,
      });

      if (!error) {
        return { avatarPath: path, avatarDataUrl: undefined };
      }
    } catch {
      // Fall back to an inline preview when storage is unavailable.
    }
  }

  return {
    avatarPath: undefined,
    avatarDataUrl: `data:${file.type};base64,${buffer.toString("base64")}`,
  };
}

export async function getCandidateProfileSettings(email: string, fullName: string) {
  const profile = await withDatabaseFallback(
    async () =>
      prisma.profile.findUnique({
        where: { email },
        select: {
          fullName: true,
          title: true,
          location: true,
          metadata: true,
          applications: {
            select: {
              roleSelectionSnapshot: true,
            },
            orderBy: {
              submittedAt: "desc",
            },
            take: 5,
          },
        },
      }),
    () => null,
  );

  const metadata = readCandidateProfileMetadata(profile?.metadata);

  return {
    fullName: profile?.fullName ?? fullName,
    headline: profile?.title ?? "",
    preferredLocation: profile?.location ?? "",
    skills: metadata.skills,
    savedJobIds: metadata.savedJobIds,
    desiredSalaryMin: metadata.desiredSalaryMin,
    desiredSalaryMax: metadata.desiredSalaryMax,
    avatarPath: metadata.avatarPath,
    avatarUrl: await resolveCandidateAvatarUrl(metadata),
    applicationInterests: uniqueCandidateStrings(
      profile?.applications.map((application) => application.roleSelectionSnapshot) ?? [],
    ),
  } satisfies CandidateProfileSettings;
}

export async function updateCandidateProfileSettings(input: {
  email: string;
  fullName: string;
  headline: string;
  preferredLocation: string;
  skills: string[];
  desiredSalaryMin?: number;
  desiredSalaryMax?: number;
  avatarFile?: File | null;
}) {
  const existing = await prisma.profile.findUnique({
    where: { email: input.email },
    select: { metadata: true },
  });

  const metadata = readCandidateProfileMetadata(existing?.metadata);
  const nextMetadata: CandidateProfileMetadata = {
    ...metadata,
    skills: uniqueCandidateStrings(input.skills),
    desiredSalaryMin: input.desiredSalaryMin,
    desiredSalaryMax: input.desiredSalaryMax,
  };

  if (input.avatarFile && input.avatarFile.size > 0) {
    const upload = await uploadCandidateAvatar(input.avatarFile);
    nextMetadata.avatarPath = upload.avatarPath;
    nextMetadata.avatarDataUrl = upload.avatarDataUrl;
  }

  await prisma.profile.upsert({
    where: { email: input.email },
    update: {
      fullName: input.fullName,
      role: "candidate",
      title: input.headline || null,
      location: input.preferredLocation || null,
      metadata: buildCandidateProfileMetadata(nextMetadata),
    },
    create: {
      email: input.email,
      fullName: input.fullName,
      role: "candidate",
      title: input.headline || null,
      location: input.preferredLocation || null,
      metadata: buildCandidateProfileMetadata(nextMetadata),
    },
  });
}

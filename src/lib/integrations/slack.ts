import crypto from "node:crypto";

import { WebClient } from "@slack/web-api";

import { env, envFlags } from "@/lib/env";

function getSlackClient() {
  if (!envFlags.hasSlackBot) {
    return null;
  }

  return new WebClient(env.SLACK_BOT_TOKEN);
}

export async function inviteToSlack(email: string, channels: string[] = []) {
  if (!envFlags.hasSlackAdminInvite) {
    return {
      mode: "preview" as const,
      ok: false,
      inviteId: `mock-invite-${email}`,
      errorMessage: "Slack admin invite API is not configured for this workspace.",
    };
  }

  const response = await fetch("https://slack.com/api/admin.users.invite", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${env.SLACK_ADMIN_USER_TOKEN}`,
      "Content-Type": "application/json; charset=utf-8",
    },
    body: JSON.stringify({
      email,
      channel_ids: channels.join(","),
    }),
  });

  const payload = await response.json();
  if (!response.ok || !payload.ok) {
    return {
      mode: "live" as const,
      ok: false,
      inviteId: `slack-${email}`,
      payload,
      errorMessage:
        (typeof payload.error === "string" && payload.error) ||
        `Slack invite failed with status ${response.status}.`,
    };
  }

  return {
    mode: "live" as const,
    ok: true,
    inviteId: (payload.invite_id as string | undefined) ?? `slack-${email}`,
    payload,
  };
}

export async function sendWelcomeDm(userId: string, text: string) {
  const client = getSlackClient();
  if (!client) {
    return { mode: "preview" as const };
  }

  await client.chat.postMessage({
    channel: userId,
    text,
  });

  return { mode: "live" as const };
}

export async function notifyHrChannel(text: string) {
  const client = getSlackClient();
  if (!client) {
    return { mode: "preview" as const };
  }

  if (env.SLACK_HR_CHANNEL_ID) {
    await client.chat.postMessage({
      channel: env.SLACK_HR_CHANNEL_ID,
      text,
    });

    return { mode: "live" as const };
  }

  const hrUser = await client.users.lookupByEmail({
    email: env.SLACK_HR_EMAIL,
  });
  const hrUserId = hrUser.user?.id;
  if (!hrUserId) {
    return { mode: "preview" as const };
  }

  await client.chat.postMessage({
    channel: hrUserId,
    text,
  });

  return { mode: "live" as const };
}

export function verifySlackSignature(input: {
  body: string;
  signature: string | null;
  timestamp: string | null;
}) {
  if (!env.SLACK_SIGNING_SECRET || !input.signature || !input.timestamp) {
    return false;
  }

  const base = `v0:${input.timestamp}:${input.body}`;
  const digest = `v0=${crypto
    .createHmac("sha256", env.SLACK_SIGNING_SECRET!)
    .update(base)
    .digest("hex")}`;

  return crypto.timingSafeEqual(Buffer.from(digest), Buffer.from(input.signature));
}

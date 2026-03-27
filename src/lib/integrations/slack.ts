import crypto from "node:crypto";

import { WebClient } from "@slack/web-api";

import { env, envFlags } from "@/lib/env";

function getSlackClient() {
  if (!envFlags.hasSlack) {
    return null;
  }

  return new WebClient(env.SLACK_BOT_TOKEN);
}

export async function inviteToSlack(email: string, channels: string[] = []) {
  if (!envFlags.hasSlack) {
    return { mode: "preview" as const, inviteId: `mock-invite-${email}` };
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
  return {
    mode: "live" as const,
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
  if (!client || !env.SLACK_HR_CHANNEL_ID) {
    return { mode: "preview" as const };
  }

  await client.chat.postMessage({
    channel: env.SLACK_HR_CHANNEL_ID,
    text,
  });

  return { mode: "live" as const };
}

export function verifySlackSignature(input: {
  body: string;
  signature: string | null;
  timestamp: string | null;
}) {
  if (!envFlags.hasSlack || !input.signature || !input.timestamp) {
    return false;
  }

  const base = `v0:${input.timestamp}:${input.body}`;
  const digest = `v0=${crypto
    .createHmac("sha256", env.SLACK_SIGNING_SECRET!)
    .update(base)
    .digest("hex")}`;

  return crypto.timingSafeEqual(Buffer.from(digest), Buffer.from(input.signature));
}

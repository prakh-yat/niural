import { Resend } from "resend";

import { env, envFlags } from "@/lib/env";

function getClient() {
  if (!envFlags.hasResend) {
    return null;
  }

  return new Resend(env.RESEND_API_KEY);
}

export async function sendTransactionalEmail(input: {
  to: string;
  subject: string;
  html: string;
  text: string;
}) {
  const client = getClient();
  if (!client) {
    return {
      mode: "preview" as const,
      message: `Email to ${input.to} queued in preview mode.`,
    };
  }

  const result = await client.emails.send({
    from: env.RESEND_FROM_EMAIL,
    to: input.to,
    subject: input.subject,
    html: input.html,
    text: input.text,
  });

  return {
    mode: "live" as const,
    message: result.data?.id ?? "sent",
  };
}

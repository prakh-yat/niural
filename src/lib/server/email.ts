import { sendTransactionalEmail } from "@/lib/integrations/resend";
import {
  findIntegrationEventByDedupeKey,
  recordIntegrationEvent,
} from "@/lib/server/workflows";

type TrackedEmailInput = {
  to: string;
  subject: string;
  html: string;
  text: string;
  attachments?: Array<{
    filename: string;
    content: string | Buffer;
    contentType?: string;
  }>;
  eventType: string;
  payload?: Record<string, unknown>;
  successDedupeKey?: string;
};

async function safeRecordEmailEvent(input: {
  eventType: string;
  status: string;
  payload: Record<string, unknown>;
  dedupeKey?: string;
}) {
  try {
    await recordIntegrationEvent(
      "resend",
      input.eventType,
      input.status,
      input.payload,
      input.dedupeKey,
    );
  } catch (error) {
    console.warn(
      `[email] Failed to record ${input.eventType} integration event: ${
        error instanceof Error ? error.message : String(error)
      }`,
    );
  }
}

export async function sendTrackedEmail(input: TrackedEmailInput) {
  if (input.successDedupeKey) {
    const existing = await findIntegrationEventByDedupeKey(input.successDedupeKey);
    if (existing) {
      const payload =
        existing.payload && typeof existing.payload === "object" && !Array.isArray(existing.payload)
          ? (existing.payload as Record<string, unknown>)
          : null;
      const deliveryMode = payload?.deliveryMode === "preview" ? "preview" : "live";
      const deliveryMessage =
        typeof payload?.deliveryMessage === "string"
          ? payload.deliveryMessage
          : "Email delivery already recorded.";

      return {
        mode: deliveryMode,
        message: deliveryMessage,
      } as const;
    }
  }

  try {
    const result = await sendTransactionalEmail({
      to: input.to,
      subject: input.subject,
      html: input.html,
      text: input.text,
      attachments: input.attachments,
    });

    await safeRecordEmailEvent({
      eventType: input.eventType,
      status: "success",
      payload: {
        to: input.to,
        subject: input.subject,
        deliveryMode: result.mode,
        deliveryMessage: result.message,
        ...input.payload,
      },
      dedupeKey: input.successDedupeKey,
    });

    return result;
  } catch (error) {
    await safeRecordEmailEvent({
      eventType: input.eventType,
      status: "failed",
      payload: {
        to: input.to,
        subject: input.subject,
        errorMessage: error instanceof Error ? error.message : "Unknown email error",
        ...input.payload,
      },
    });

    throw error;
  }
}

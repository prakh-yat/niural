import crypto from "node:crypto";

import { env, envFlags } from "@/lib/env";

const transcriptQuery = `
  query Transcript($transcriptId: String!) {
    transcript(id: $transcriptId) {
      id
      title
      transcript_url
      meeting_link
      organizer_email
      meeting_attendees {
        email
        name
        displayName
      }
      sentences {
        speaker_name
        text
        start_time
        end_time
      }
      summary {
        overview
        short_summary
        action_items
        topics_discussed
        gist
      }
    }
  }
`;

export async function fetchFirefliesTranscript(meetingId: string) {
  if (!envFlags.hasFireflies) {
    return {
      providerMeetingId: meetingId,
      summary:
        "Preview transcript summary: the candidate focused on workflow reliability, operator empathy, and explicit failure handling.",
      transcript:
        "Candidate: The point of AI in hiring is not novelty. It is making the workflow trustworthy, inspectable, and materially faster for the team running it.",
      meetingLink: undefined,
      attendeeEmails: [],
      transcriptJson: {
        preview: true,
      },
    };
  }

  const response = await fetch("https://api.fireflies.ai/graphql", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${env.FIREFLIES_API_KEY}`,
    },
    body: JSON.stringify({
      query: transcriptQuery,
      variables: {
        transcriptId: meetingId,
      },
    }),
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(`Fireflies request failed with ${response.status}`);
  }

  const payload = await response.json();
  const transcript = payload.data?.transcript;

  if (!transcript?.id) {
    throw new Error("Fireflies transcript was not found or is not accessible.");
  }

  const summary =
    transcript.summary?.short_summary ||
    transcript.summary?.overview ||
    transcript.summary?.gist ||
    "Fireflies returned a transcript without a generated summary.";

  const flatTranscript =
    transcript.sentences
      ?.map((sentence: { speaker_name?: string; text?: string }) =>
        [sentence.speaker_name, sentence.text].filter(Boolean).join(": "),
      )
      .join("\n") ?? "";

  return {
    providerMeetingId: transcript.id as string,
    summary,
    transcript: flatTranscript,
    meetingLink: (transcript.meeting_link as string | undefined) ?? undefined,
    attendeeEmails: Array.from(
      new Set(
        (transcript.meeting_attendees as { email?: string | null }[] | undefined)?.flatMap(
          (attendee) => (attendee.email ? [attendee.email] : []),
        ) ?? [],
      ),
    ),
    transcriptJson: payload,
  };
}

export async function addFirefliesToLiveMeeting(input: {
  meetingLink: string;
  title?: string;
  attendeeEmails?: string[];
}) {
  if (!envFlags.hasFireflies) {
    return { success: true, mode: "preview" as const };
  }

  const response = await fetch("https://api.fireflies.ai/graphql", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${env.FIREFLIES_API_KEY}`,
    },
    body: JSON.stringify({
      query: `
        mutation AddToLiveMeeting(
          $meetingLink: String!
          $title: String
          $attendees: [Attendee]
        ) {
          addToLiveMeeting(
            meeting_link: $meetingLink
            title: $title
            attendees: $attendees
          ) {
            success
          }
        }
      `,
      variables: {
        meetingLink: input.meetingLink,
        title: input.title,
        attendees:
          input.attendeeEmails?.map((email) => ({
            email,
          })) ?? [],
      },
    }),
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(`Fireflies add-to-live failed with ${response.status}`);
  }

  const payload = await response.json();
  return {
    success: Boolean(payload.data?.addToLiveMeeting?.success),
    mode: "live" as const,
    payload,
  };
}

export function verifyFirefliesSignature(input: {
  body: string;
  signature: string | null;
}) {
  if (!env.FIREFLIES_WEBHOOK_SECRET || !input.signature) {
    return false;
  }

  const expected = `sha256=${crypto
    .createHmac("sha256", env.FIREFLIES_WEBHOOK_SECRET)
    .update(input.body, "utf8")
    .digest("hex")}`;

  const actual = input.signature;
  if (actual.length !== expected.length) {
    return false;
  }

  return crypto.timingSafeEqual(Buffer.from(actual), Buffer.from(expected));
}

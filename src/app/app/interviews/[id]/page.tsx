import { notFound } from "next/navigation";

import { InterviewSchedulingPicker } from "@/components/candidate/interview-scheduling-picker";
import { FlashBanner } from "@/components/ui/flash-banner";
import { Panel } from "@/components/ui/panel";
import { getCandidateByInterviewId } from "@/lib/server/data";
import { FLASH_COOKIE_NAMES, readFlashMessage } from "@/lib/server/flash";

export default async function InterviewDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [candidate, flash] = await Promise.all([
    getCandidateByInterviewId(id),
    readFlashMessage(FLASH_COOKIE_NAMES.candidateInterview),
  ]);

  if (!candidate) {
    notFound();
  }

  const aiRescheduleProposal =
    candidate.interview.rescheduleRequest?.approvalStatus === "declined" &&
    candidate.interview.rescheduleRequest.proposedSlots.length > 0
      ? candidate.interview.rescheduleRequest.proposedSlots[0]
      : null;
  const dayGroups = (aiRescheduleProposal ? [] : candidate.interview.offeredSlots).reduce<
    Array<{
      key: string;
      label: string;
      shortLabel: string;
      slots: typeof candidate.interview.offeredSlots;
    }>
  >((groups, slot) => {
    const date = new Date(slot.startsAt);
    const dayKey = date.toISOString().slice(0, 10);
    const existing = groups.find((group) => group.key === dayKey);

    if (existing) {
      existing.slots.push(slot);
      return groups;
    }

    groups.push({
      key: dayKey,
      label: date.toLocaleDateString("en-US", {
        weekday: "long",
        month: "long",
        day: "numeric",
      }),
      shortLabel: date.toLocaleDateString("en-US", {
        weekday: "short",
        month: "short",
        day: "numeric",
      }),
      slots: [slot],
    });

    return groups;
  }, []);
  const hasOpenAvailability = dayGroups.length > 0;
  const pendingRescheduleReview =
    candidate.interview.rescheduleRequest?.approvalStatus === "pending";
  const aiReschedulePendingDecision = Boolean(aiRescheduleProposal);
  const title = hasOpenAvailability
    ? candidate.interview.status === "scheduled"
      ? "Choose your updated interview time"
      : "Choose your interview time"
    : aiReschedulePendingDecision
      ? "The interviewer suggested a new time"
      : candidate.interview.status === "scheduled"
        ? "Your interview is confirmed"
        : "Interview scheduling in progress";
  const description = hasOpenAvailability
    ? "Review live availability from the connected Google Calendar and confirm the slot that works best for you."
    : aiReschedulePendingDecision
      ? candidate.interview.rescheduleRequest?.aiMessage ||
        "The interviewer declined the earlier request, but a new held time is available for you to review."
    : pendingRescheduleReview
      ? "We’re reviewing your alternate-time request with the interviewer. Your currently held options stay blocked until a replacement is approved."
      : "Review the confirmed meeting details below or request updated availability if you need to reschedule.";

  return (
    <div className="mx-auto max-w-6xl space-y-8 px-6 py-10">
      {flash ? <FlashBanner cookieName={FLASH_COOKIE_NAMES.candidateInterview} flash={flash} /> : null}

      <div>
        <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">Interview</p>
        <h1 className="mt-2 text-2xl font-semibold text-gray-900">{title}</h1>
        <p className="mt-2 text-sm text-gray-500">{description}</p>
      </div>

      <InterviewSchedulingPicker
        interviewId={candidate.interview.id}
        status={candidate.interview.status}
        interviewerName={candidate.interview.interviewerName}
        interviewerEmail={candidate.interview.interviewerEmail}
        meetingUrl={candidate.interview.meetingUrl}
        dayGroups={dayGroups}
        emptyStateMessage={
          aiReschedulePendingDecision
            ? "Review the AI-proposed replacement time below."
            : undefined
        }
      />

      {aiRescheduleProposal ? (
        <Panel className="max-w-3xl">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-amber-700">
            Interviewer declined the previous request
          </p>
          <p className="mt-3 text-sm leading-7 text-gray-600">
            {candidate.interview.rescheduleRequest?.aiMessage ||
              "A new held time is available based on the interviewer calendar. Does this option work for you?"}
          </p>
          <div className="mt-5 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-4">
            <p className="text-sm font-semibold text-amber-950">{aiRescheduleProposal.label}</p>
          </div>
          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            <form action="/api/scheduling/confirm" method="post">
              <input type="hidden" name="interviewId" value={candidate.interview.id} />
              <input type="hidden" name="slotStart" value={aiRescheduleProposal.startsAt} />
              <input type="hidden" name="slotEnd" value={aiRescheduleProposal.endsAt} />
              <button
                type="submit"
                className="w-full rounded-xl bg-violet-600 px-4 py-3 text-sm font-medium text-white transition hover:bg-violet-700"
              >
                Yes, this time works
              </button>
            </form>
            <form action="/api/scheduling/reschedule-suggestion" method="post">
              <input type="hidden" name="interviewId" value={candidate.interview.id} />
              <button
                type="submit"
                className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm font-medium text-gray-700 transition hover:bg-gray-50"
              >
                No, show another option
              </button>
            </form>
          </div>
        </Panel>
      ) : null}

      {pendingRescheduleReview ? (
        <Panel className="max-w-3xl">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-amber-700">
            Alternate-time request in review
          </p>
          <p className="mt-3 text-sm leading-7 text-gray-600">
            The interviewer is reviewing a fresh set of options for you. Your current offered slots
            stay reserved until they approve a replacement or you confirm one of the existing times.
          </p>
          {candidate.interview.rescheduleRequest?.rescheduleNotes ? (
            <p className="mt-4 rounded-2xl bg-amber-50 px-4 py-3 text-sm leading-7 text-amber-900">
              Your note: {candidate.interview.rescheduleRequest.rescheduleNotes}
            </p>
          ) : null}
        </Panel>
      ) : null}

      <Panel className="max-w-2xl">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-gray-400">
          Need a different time?
        </p>
        <form action="/api/scheduling/offers" method="post" className="mt-4 grid gap-4">
          <input type="hidden" name="interviewId" value={candidate.interview.id} />
          <label className="flex flex-col gap-1.5 text-sm font-medium text-gray-700">
            Share alternative availability
            <textarea
              name="rescheduleNotes"
              rows={5}
              placeholder="For example: Apr 3 after 2pm ET, Apr 4 before noon ET..."
              className="rounded-xl border border-gray-300 bg-white px-3 py-3 text-sm"
            />
          </label>
          <button
            type="submit"
            className="rounded-xl border border-gray-300 px-4 py-3 text-sm font-medium text-gray-700 transition hover:bg-gray-50"
          >
            {pendingRescheduleReview ? "Update availability request" : "Request new options"}
          </button>
        </form>
      </Panel>
    </div>
  );
}

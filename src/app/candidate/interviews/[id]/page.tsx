import { notFound } from "next/navigation";

import { PageFrame } from "@/components/shell/page-frame";
import { Panel } from "@/components/ui/panel";
import { StatusPill } from "@/components/ui/status-pill";
import { getCandidateByInterviewId } from "@/lib/server/data";
import { formatLongDateTime } from "@/lib/utils";

export default async function CandidateInterviewPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const candidate = await getCandidateByInterviewId(id);

  if (!candidate) {
    notFound();
  }

  return (
    <PageFrame>
      <section className="grid gap-6 lg:grid-cols-[0.8fr_1.2fr]">
        <Panel className="flex flex-col gap-6">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="dense-label">Interview orchestration</p>
              <h1 className="mt-2 font-display text-[2.4rem] tracking-[-0.05em] text-ink">
                Interview details
              </h1>
            </div>
            <StatusPill label={candidate.interview.status} tone={candidate.interview.status} />
          </div>
          <div className="rounded-[1.5rem] bg-panel-strong p-4">
            <p className="dense-label">Interviewer</p>
            <p className="mt-2 text-base font-semibold text-ink">{candidate.interview.interviewerName}</p>
            <p className="mt-1 text-sm text-ink-soft">{candidate.interview.interviewerEmail}</p>
          </div>
          <div className="rounded-[1.5rem] bg-panel-strong p-4">
            <p className="dense-label">Meeting link</p>
            <p className="mt-2 text-sm leading-7 text-ink-soft">
              {candidate.interview.meetingUrl ?? "Generated after confirmation."}
            </p>
          </div>
        </Panel>

        <div className="grid gap-5">
          <Panel className="flex flex-col gap-4">
            <p className="dense-label">Available or held slots</p>
            <div className="grid gap-3">
              {candidate.interview.offeredSlots.map((slot) => (
                <form
                  key={slot.startsAt}
                  action="/api/scheduling/confirm"
                  method="post"
                  className="grid gap-4 rounded-[1.4rem] border border-line bg-panel px-4 py-4 md:grid-cols-[1fr_auto]"
                >
                  <input type="hidden" name="interviewId" value={candidate.interview.id} />
                  <input type="hidden" name="slotStart" value={slot.startsAt} />
                  <input type="hidden" name="slotEnd" value={slot.endsAt} />
                  <div>
                    <p className="text-sm font-semibold text-ink">{slot.label}</p>
                    <p className="mt-1 text-sm text-ink-soft">
                      {formatLongDateTime(slot.startsAt)} to {formatLongDateTime(slot.endsAt)}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <StatusPill label={slot.status} tone={slot.status} />
                    <button
                      type="submit"
                      className="rounded-full bg-accent px-4 py-2 text-sm font-semibold text-white"
                    >
                      Confirm
                    </button>
                  </div>
                </form>
              ))}
            </div>
          </Panel>

          <Panel className="flex flex-col gap-4">
            <p className="dense-label">Need a different time?</p>
            <form action="/api/scheduling/offers" method="post" className="grid gap-4">
              <input type="hidden" name="interviewId" value={candidate.interview.id} />
              <label className="flex flex-col gap-2 text-sm font-medium text-ink">
                Share alternative availability
                <textarea
                  name="rescheduleNotes"
                  rows={5}
                  placeholder="For example: Apr 3 after 2pm ET, Apr 4 before noon ET..."
                  className="rounded-[1.4rem] border border-line bg-panel px-4 py-3 text-ink outline-none transition focus:border-accent"
                />
              </label>
              <button
                type="submit"
                className="rounded-full border border-line bg-white px-4 py-3 text-sm font-semibold text-ink"
              >
                Request new options
              </button>
            </form>
          </Panel>
        </div>
      </section>
    </PageFrame>
  );
}

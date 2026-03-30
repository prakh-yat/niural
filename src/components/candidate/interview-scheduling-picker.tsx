"use client";

import { useState } from "react";

import { StatusPill } from "@/components/ui/status-pill";

type InterviewSlot = {
  label: string;
  startsAt: string;
  endsAt: string;
  status: string;
};

type InterviewDayGroup = {
  key: string;
  label: string;
  shortLabel: string;
  slots: InterviewSlot[];
};

export function InterviewSchedulingPicker({
  interviewId,
  status,
  interviewerName,
  interviewerEmail,
  meetingUrl,
  dayGroups,
  emptyStateMessage,
}: {
  interviewId: string;
  status: string;
  interviewerName: string;
  interviewerEmail: string;
  meetingUrl?: string;
  dayGroups: InterviewDayGroup[];
  emptyStateMessage?: string;
}) {
  const [selectedDayKey, setSelectedDayKey] = useState(dayGroups[0]?.key ?? "");
  const selectedDay = dayGroups.find((group) => group.key === selectedDayKey) ?? dayGroups[0];

  return (
    <div className="overflow-hidden rounded-[1.75rem] border border-gray-200 bg-white shadow-[0_24px_64px_rgba(15,23,42,0.05)]">
      <div className="grid lg:grid-cols-[280px_minmax(0,1fr)_280px]">
        <aside className="border-b border-gray-100 bg-[#faf8ff] px-6 py-8 lg:border-b-0 lg:border-r">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-violet-500">
            Interview scheduling
          </p>
          <h2 className="mt-4 text-2xl font-semibold tracking-[-0.03em] text-gray-950">
            Pick a time that works for you
          </h2>

          <div className="mt-6 flex flex-wrap gap-2">
            <StatusPill label={status} tone={status} className="capitalize" />
            <StatusPill label="45 minutes" tone="preview" />
          </div>

          <div className="mt-8 space-y-5 text-sm text-gray-600">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-gray-400">
                Interviewer
              </p>
              <p className="mt-2 font-semibold text-gray-900">
                {interviewerName || "Connected interviewer calendar"}
              </p>
              {interviewerEmail ? <p className="mt-1 text-gray-500">{interviewerEmail}</p> : null}
            </div>

            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-gray-400">
                Meeting
              </p>
              <p className="mt-2 text-gray-500">
                Google Meet link is created automatically once you confirm a slot.
              </p>
              {meetingUrl ? (
                <a
                  href={meetingUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-3 inline-flex text-sm font-medium text-violet-600 transition hover:text-violet-800"
                >
                  Open confirmed meeting
                </a>
              ) : null}
            </div>
          </div>
        </aside>

        <section className="border-b border-gray-100 px-6 py-8 lg:border-b-0 lg:border-r">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-gray-400">
            Select a day
          </p>
          <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {dayGroups.map((group) => {
              const selected = group.key === selectedDay?.key;

              return (
                <button
                  key={group.key}
                  type="button"
                  onClick={() => setSelectedDayKey(group.key)}
                  className={`rounded-2xl border px-4 py-4 text-left transition ${
                    selected
                      ? "border-violet-500 bg-violet-50 text-violet-900 shadow-[0_12px_24px_rgba(124,58,237,0.08)]"
                      : "border-gray-200 bg-white text-gray-700 hover:border-violet-200 hover:bg-violet-50/40"
                  }`}
                >
                  <p className="text-sm font-semibold">{group.shortLabel}</p>
                  <p className={`mt-1 text-sm ${selected ? "text-violet-700" : "text-gray-500"}`}>
                    {group.label}
                  </p>
                  <p className={`mt-3 text-xs font-medium ${selected ? "text-violet-700" : "text-gray-400"}`}>
                    {group.slots.length} available time{group.slots.length === 1 ? "" : "s"}
                  </p>
                </button>
              );
            })}
          </div>
        </section>

        <section className="px-6 py-8">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-gray-400">
            {selectedDay ? selectedDay.label : "Available times"}
          </p>

          {selectedDay ? (
            <div className="mt-6 grid gap-3">
              {selectedDay.slots.map((slot) => (
                <form key={slot.startsAt} action="/api/scheduling/confirm" method="post">
                  <input type="hidden" name="interviewId" value={interviewId} />
                  <input type="hidden" name="slotStart" value={slot.startsAt} />
                  <input type="hidden" name="slotEnd" value={slot.endsAt} />
                  <button
                    type="submit"
                    disabled={slot.status !== "held"}
                    className="flex w-full items-center justify-between rounded-2xl border border-gray-200 px-4 py-4 text-left transition hover:border-violet-300 hover:bg-violet-50/40 disabled:cursor-not-allowed disabled:opacity-70"
                  >
                    <div>
                      <p className="text-base font-semibold text-gray-900">
                        {new Date(slot.startsAt).toLocaleTimeString("en-US", {
                          hour: "numeric",
                          minute: "2-digit",
                        })}
                      </p>
                      <p className="mt-1 text-sm text-gray-500">{slot.label}</p>
                    </div>
                    <StatusPill
                      label={slot.status === "held" ? "Select" : slot.status}
                      tone={slot.status === "held" ? "scheduled" : slot.status}
                      className="capitalize"
                    />
                  </button>
                </form>
              ))}
            </div>
          ) : (
            <div className="mt-6 rounded-2xl border border-dashed border-gray-200 px-4 py-8 text-sm text-gray-500">
              {emptyStateMessage ||
                (status === "scheduled"
                  ? "Your interview is already confirmed. The meeting link is available on the left."
                  : "No availability has been shared yet.")}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

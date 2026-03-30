import { cn } from "@/lib/utils";

const tones: Record<string, string> = {
  open: "bg-green-50 text-green-700",
  complete: "bg-green-50 text-green-700",
  completed: "bg-green-50 text-green-700",
  signed: "bg-green-50 text-green-700",
  onboarded: "bg-green-50 text-green-700",
  sent: "bg-violet-50 text-violet-700",
  offer_sent: "bg-violet-50 text-violet-700",
  offer_drafting: "bg-violet-50 text-violet-700",
  scheduled: "bg-blue-50 text-blue-700",
  confirmed: "bg-blue-50 text-blue-700",
  interview_scheduled: "bg-blue-50 text-blue-700",
  interview_completed: "bg-blue-50 text-blue-700",
  interview_pending: "bg-blue-50 text-blue-700",
  shortlisted: "bg-emerald-50 text-emerald-700",
  screened: "bg-amber-50 text-amber-700",
  applied: "bg-gray-100 text-gray-600",
  held: "bg-amber-50 text-amber-700",
  partial: "bg-amber-50 text-amber-700",
  preview: "bg-amber-50 text-amber-700",
  paused: "bg-amber-50 text-amber-700",
  pending_approval: "bg-amber-50 text-amber-700",
  best_fit: "bg-emerald-50 text-emerald-700",
  closed: "bg-red-50 text-red-700",
  rejected: "bg-red-50 text-red-700",
  declined: "bg-red-50 text-red-700",
  needs_review: "bg-red-50 text-red-700",
  draft: "bg-gray-100 text-gray-600",
  queued: "bg-gray-100 text-gray-600",
  released: "bg-gray-100 text-gray-500",
  superseded: "bg-gray-100 text-gray-500",
  expired: "bg-red-50 text-red-700",
};

export function StatusPill({
  label,
  tone,
  className,
}: {
  label: string;
  tone?: string;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold tracking-[0.02em]",
        tones[tone ?? label.toLowerCase()] ?? "bg-panel-strong text-ink-soft",
        className,
      )}
    >
      {label}
    </span>
  );
}

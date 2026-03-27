import { cn } from "@/lib/utils";

const tones: Record<string, string> = {
  open: "bg-success-soft text-success",
  complete: "bg-success-soft text-success",
  completed: "bg-success-soft text-success",
  sent: "bg-accent-soft text-accent-strong",
  scheduled: "bg-accent-soft text-accent-strong",
  confirmed: "bg-accent-soft text-accent-strong",
  held: "bg-warning-soft text-warning",
  partial: "bg-warning-soft text-warning",
  preview: "bg-warning-soft text-warning",
  paused: "bg-warning-soft text-warning",
  closed: "bg-danger-soft text-danger",
  rejected: "bg-danger-soft text-danger",
  declined: "bg-danger-soft text-danger",
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

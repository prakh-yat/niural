import { cn } from "@/lib/utils";

export function SectionHeading({
  eyebrow,
  title,
  body,
  className,
}: {
  eyebrow?: string;
  title: string;
  body?: string;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col gap-3", className)}>
      {eyebrow ? (
        <span className="text-xs font-semibold uppercase tracking-wider text-gray-400">
          {eyebrow}
        </span>
      ) : null}
      <h2 className="text-xl font-semibold text-gray-900">{title}</h2>
      {body ? <p className="max-w-2xl text-sm leading-relaxed text-gray-500">{body}</p> : null}
    </div>
  );
}

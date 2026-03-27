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
    <div className={cn("flex flex-col gap-4", className)}>
      {eyebrow ? <span className="eyebrow">{eyebrow}</span> : null}
      <div className="flex flex-col gap-3">
        <h2 className="font-display text-[2rem] leading-[0.96] tracking-[-0.05em] text-ink md:text-[3.3rem]">
          {title}
        </h2>
        {body ? <p className="max-w-2xl text-base leading-7 text-ink-soft md:text-lg">{body}</p> : null}
      </div>
    </div>
  );
}

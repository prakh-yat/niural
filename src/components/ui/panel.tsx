import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

export function Panel({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "rounded-[1.5rem] border border-line bg-panel px-5 py-5 shadow-[0_14px_28px_rgba(19,25,38,0.05)] md:px-6",
        className,
      )}
    >
      {children}
    </div>
  );
}

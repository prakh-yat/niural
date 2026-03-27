import type { ReactNode } from "react";

import { SiteHeader } from "@/components/shell/site-header";
import { cn } from "@/lib/utils";

export function PageFrame({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className="surface-grid radial-accent min-h-screen">
      <SiteHeader />
      <main className={cn("mx-auto flex w-full max-w-[1360px] flex-col gap-8 px-4 pb-12 pt-6 md:px-6", className)}>
        {children}
      </main>
    </div>
  );
}

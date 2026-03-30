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
    <div className="min-h-screen bg-[#fafafa]">
      <SiteHeader />
      <main className={cn("mx-auto flex w-full max-w-[1280px] flex-col gap-8 px-6 pb-12 pt-8", className)}>
        {children}
      </main>
    </div>
  );
}

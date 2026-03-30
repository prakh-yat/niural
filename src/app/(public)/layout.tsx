import type { ReactNode } from "react";

import { SiteHeader } from "@/components/shell/site-header";

export default function PublicLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <SiteHeader />
      {children}
    </>
  );
}

import type { ReactNode } from "react";

import { AdminShell } from "@/components/shell/admin-shell";
import { buildAppUrl } from "@/lib/portal";
import { getViewer } from "@/lib/server/auth";

export default async function AdminLayout({ children }: { children: ReactNode }) {
  const viewer = await getViewer("admin");

  return (
    <AdminShell
      candidatePortalHref={buildAppUrl("/")}
      careersHref="/careers"
      viewerName={viewer?.fullName ?? "Admin"}
      viewerRole={viewer?.role ?? "admin"}
      isPreview={viewer?.isPreview ?? true}
    >
      {children}
    </AdminShell>
  );
}

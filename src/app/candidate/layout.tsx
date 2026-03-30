import type { ReactNode } from "react";

import { CandidateShell } from "@/components/shell/candidate-shell";
import { buildAdminUrl } from "@/lib/portal";
import { getViewer } from "@/lib/server/auth";

export default async function CandidateLayout({ children }: { children: ReactNode }) {
  const viewer = await getViewer("candidate");

  return (
    <CandidateShell
      adminPortalHref={buildAdminUrl("/")}
      careersHref="/careers"
      viewerName={viewer?.fullName ?? "Candidate"}
      isPreview={viewer?.isPreview ?? true}
    >
      {children}
    </CandidateShell>
  );
}

import type { ReactNode } from "react";
import { redirect } from "next/navigation";

import { CandidateSidebar } from "@/components/ui/candidate-sidebar";
import { getViewer } from "@/lib/server/auth";

export default async function AppLayout({ children }: { children: ReactNode }) {
  const viewer = await getViewer("candidate");

  if (!viewer) {
    redirect("/auth/sign-in");
  }

  return (
    <div className="flex min-h-screen">
      <CandidateSidebar userName={viewer.fullName} />
      <main className="flex-1 overflow-y-auto bg-[#fafafa] p-6 lg:p-8">{children}</main>
    </div>
  );
}

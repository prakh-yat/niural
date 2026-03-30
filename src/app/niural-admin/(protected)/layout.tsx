import type { ReactNode } from "react";
import { redirect } from "next/navigation";

import { AdminSidebar } from "@/components/ui/admin-sidebar";
import { getViewer } from "@/lib/server/auth";

export default async function NiuralAdminLayout({ children }: { children: ReactNode }) {
  const viewer = await getViewer("admin");

  if (!viewer) {
    redirect("/niural-admin/login");
  }

  return (
    <div className="flex min-h-screen">
      <AdminSidebar userName={viewer.fullName} />
      <main className="flex-1 overflow-y-auto bg-[#fafafa] p-6 lg:p-8">{children}</main>
    </div>
  );
}

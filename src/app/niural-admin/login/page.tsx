import { redirect } from "next/navigation";

import { PortalSignInForm } from "@/components/auth/portal-sign-in-form";
import { getViewer } from "@/lib/server/auth";
import { FLASH_COOKIE_NAMES, readFlashMessage } from "@/lib/server/flash";

export default async function AdminLoginPage() {
  const viewer = await getViewer("admin");
  if (viewer && !viewer.isPreview) {
    redirect(viewer.role === "admin" ? "/niural-admin" : "/app");
  }

  const flash = await readFlashMessage(FLASH_COOKIE_NAMES.adminAuth);

  return (
    <PortalSignInForm
      role="admin"
      nextPath="/niural-admin"
      flashCookieName={FLASH_COOKIE_NAMES.adminAuth}
      flash={flash}
      badge="Internal workspace"
      title="Access the hiring workspace"
      description="Use your company email to review candidates, scheduling, and offers in one place."
      visualTitle="Run the hiring desk without the operational drag."
      visualDescription="Screen applicants, move interviews forward, and coordinate offers from a single internal workspace."
      emailLabel="Work email"
      emailPlaceholder="name@company.com"
      footerCopy="Access is restricted to your internal hiring workspace credentials."
    />
  );
}

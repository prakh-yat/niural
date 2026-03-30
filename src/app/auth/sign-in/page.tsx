import { redirect } from "next/navigation";

import { PortalSignInForm } from "@/components/auth/portal-sign-in-form";
import { getViewer } from "@/lib/server/auth";
import { FLASH_COOKIE_NAMES, readFlashMessage } from "@/lib/server/flash";

export default async function SignInPage() {
  const viewer = await getViewer("candidate");
  if (viewer && !viewer.isPreview) {
    redirect(viewer.role === "admin" ? "/niural-admin" : "/app");
  }

  const flash = await readFlashMessage(FLASH_COOKIE_NAMES.candidateAuth);

  return (
    <PortalSignInForm
      role="candidate"
      nextPath="/app"
      flashCookieName={FLASH_COOKIE_NAMES.candidateAuth}
      flash={flash}
      badge="Candidate access"
      title="Sign in to your account"
      description="Track your applications, interviews, and saved jobs from one place."
      visualTitle="Find better roles with a faster hiring loop."
      visualDescription="Search live openings, save the best ones, and move through screening without the usual hiring friction."
      emailLabel="Email address"
      emailPlaceholder="you@example.com"
      footerCopy="By continuing, you agree to receive a secure sign-in link for your candidate workspace."
    />
  );
}

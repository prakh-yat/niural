"use client";

import { useCallback, useState } from "react";

import { FlashBanner } from "@/components/ui/flash-banner";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import type { FlashMessage } from "@/lib/server/flash";

import { AuthSplitShell } from "./auth-split-shell";

function GoogleButton({
  loading,
  onClick,
}: {
  loading: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={loading}
      className="flex w-full items-center justify-center gap-3 rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm font-medium text-gray-700 transition hover:border-violet-200 hover:bg-violet-50/60 disabled:cursor-not-allowed disabled:opacity-60"
    >
      <svg className="h-5 w-5" viewBox="0 0 24 24">
        <path
          d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
          fill="#4285F4"
        />
        <path
          d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
          fill="#34A853"
        />
        <path
          d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
          fill="#FBBC05"
        />
        <path
          d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
          fill="#EA4335"
        />
      </svg>
      {loading ? "Connecting..." : "Continue with Google"}
    </button>
  );
}

type PortalSignInFormProps = {
  role: "candidate" | "admin";
  nextPath: string;
  flashCookieName: string;
  flash: FlashMessage | null;
  badge: string;
  title: string;
  description: string;
  visualTitle: string;
  visualDescription: string;
  emailLabel: string;
  emailPlaceholder: string;
  footerCopy: string;
};

export function PortalSignInForm({
  role,
  nextPath,
  flashCookieName,
  flash,
  badge,
  title,
  description,
  visualTitle,
  visualDescription,
  emailLabel,
  emailPlaceholder,
  footerCopy,
}: PortalSignInFormProps) {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "sent" | "error">("idle");
  const [localError, setLocalError] = useState<string | null>(null);

  const handleGoogleSignIn = useCallback(async () => {
    setStatus("loading");
    setLocalError(null);

    const supabase = createSupabaseBrowserClient(role);
    if (!supabase) {
      setStatus("error");
      setLocalError("Authentication is not configured.");
      return;
    }

    const { error: authError } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback?role=${encodeURIComponent(role)}&next=${encodeURIComponent(nextPath)}`,
        queryParams: {
          access_type: "offline",
          prompt: "consent",
        },
      },
    });

    if (authError) {
      setStatus("error");
      setLocalError(authError.message);
      return;
    }

    setStatus("idle");
  }, [nextPath, role]);

  const handleMagicLink = useCallback(
    async (event: React.FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      setStatus("loading");
      setLocalError(null);

      const formData = new FormData();
      formData.set("email", email);
      formData.set("role", role);
      formData.set("next", nextPath);

      const response = await fetch("/api/auth/magic-link", {
        method: "POST",
        body: formData,
      });

      if (response.redirected) {
        window.location.href = response.url;
        return;
      }

      if (!response.ok) {
        setStatus("error");
        setLocalError("Unable to send a magic link right now.");
        return;
      }

      setStatus("sent");
    },
    [email, nextPath, role],
  );

  return (
    <AuthSplitShell
      badge={badge}
      title={title}
      description={description}
      visualTitle={visualTitle}
      visualDescription={visualDescription}
    >
      <div className="space-y-5">
        {flash ? <FlashBanner cookieName={flashCookieName} flash={flash} /> : null}

        {localError ? (
          <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {localError}
          </div>
        ) : null}

        {status === "sent" ? (
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
            Magic link sent. Open your inbox to finish signing in.
          </div>
        ) : null}

        <GoogleButton loading={status === "loading"} onClick={handleGoogleSignIn} />

        <div className="flex items-center gap-4">
          <div className="h-px flex-1 bg-gray-200" />
          <span className="text-xs uppercase tracking-[0.2em] text-gray-400">or use email</span>
          <div className="h-px flex-1 bg-gray-200" />
        </div>

        <form onSubmit={handleMagicLink} className="space-y-4">
          <label className="flex flex-col gap-2 text-sm font-medium text-gray-700">
            {emailLabel}
            <input
              type="email"
              name="email"
              required
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder={emailPlaceholder}
              className="rounded-2xl border border-gray-200 bg-[#fbfbfb] px-4 py-3 text-sm text-gray-900 outline-none transition focus:border-violet-400 focus:ring-4 focus:ring-violet-500/10"
            />
          </label>

          <button
            type="submit"
            disabled={status === "loading"}
            className="w-full rounded-2xl bg-[linear-gradient(135deg,#7c3aed,#5b21b6)] px-4 py-3 text-sm font-semibold text-white shadow-[0_20px_50px_rgba(91,33,182,0.25)] transition hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {status === "loading" ? "Sending link..." : "Send magic link"}
          </button>
        </form>

        <p className="text-center text-xs leading-6 text-gray-400">{footerCopy}</p>
      </div>
    </AuthSplitShell>
  );
}

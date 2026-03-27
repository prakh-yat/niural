import Link from "next/link";

import { PageFrame } from "@/components/shell/page-frame";
import { Panel } from "@/components/ui/panel";

export default async function SignInPage({
  searchParams,
}: {
  searchParams: Promise<{ role?: string }>;
}) {
  const { role = "candidate" } = await searchParams;

  return (
    <PageFrame>
      <section className="mx-auto grid w-full max-w-[760px] gap-6">
        <Panel className="flex flex-col gap-6">
          <div>
            <p className="dense-label">Passwordless access</p>
            <h1 className="mt-2 font-display text-[2.6rem] tracking-[-0.05em] text-ink">
              Sign in with a magic link
            </h1>
          </div>
          <p className="text-sm leading-8 text-ink-soft">
            The prototype uses Supabase magic links for both candidate and internal access. If Supabase is not configured yet, the app falls back to preview mode so the UI still demos cleanly.
          </p>
          <form action="/api/auth/magic-link" method="post" className="grid gap-4">
            <input type="hidden" name="role" value={role} />
            <label className="flex flex-col gap-2 text-sm font-medium text-ink">
              Work email
              <input
                type="email"
                name="email"
                required
                className="rounded-[1.4rem] border border-line bg-panel px-4 py-3"
              />
            </label>
            <button
              type="submit"
              className="rounded-full bg-accent px-5 py-3 text-sm font-semibold text-white"
            >
              Send magic link
            </button>
          </form>
          <div className="text-sm text-ink-soft">
            Looking for the admin workspace?{" "}
            <Link href="/auth/sign-in?role=admin" className="font-semibold text-accent-strong">
              Switch to internal access
            </Link>
          </div>
        </Panel>
      </section>
    </PageFrame>
  );
}

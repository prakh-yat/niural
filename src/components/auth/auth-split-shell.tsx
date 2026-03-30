import type { ReactNode } from "react";

type AuthSplitShellProps = {
  badge: string;
  title: string;
  description: string;
  visualTitle: string;
  visualDescription: string;
  children: ReactNode;
};

const visualImage =
  "https://images.unsplash.com/photo-1477959858617-67f85cf4f1df?auto=format&fit=crop&w=1800&q=80";

export function AuthSplitShell({
  badge,
  title,
  description,
  visualTitle,
  visualDescription,
  children,
}: AuthSplitShellProps) {
  return (
    <div className="min-h-screen bg-[#f3f0ea] lg:grid lg:grid-cols-[minmax(0,7fr)_minmax(420px,3fr)]">
      <section
        className="relative hidden min-h-screen overflow-hidden lg:flex"
        style={{
          backgroundImage: `linear-gradient(135deg, rgba(8, 11, 23, 0.72), rgba(60, 12, 96, 0.28)), url(${visualImage})`,
          backgroundPosition: "center",
          backgroundSize: "cover",
        }}
      >
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.18),transparent_28%),linear-gradient(to_bottom,transparent,rgba(0,0,0,0.28))]" />
        <div className="absolute inset-0 bg-[linear-gradient(120deg,rgba(255,255,255,0.08)_0,rgba(255,255,255,0.02)_40%,transparent_40%,transparent_100%)]" />
        <div className="relative flex h-full w-full flex-col justify-between p-12 text-white xl:p-16">
          <div className="flex items-center gap-3 text-lg font-semibold tracking-tight">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-white/25 bg-white/10 text-xl font-bold shadow-[0_18px_48px_rgba(0,0,0,0.18)]">
              N
            </div>
            <div>
              <p className="text-xs uppercase tracking-[0.32em] text-white/60">{badge}</p>
              <p className="text-2xl">Niural</p>
            </div>
          </div>

          <div className="max-w-4xl">
            <p className="text-sm font-medium uppercase tracking-[0.4em] text-white/60">
              AI-first talent platform
            </p>
            <h1 className="mt-6 max-w-4xl text-6xl font-semibold leading-[0.95] tracking-[-0.05em]">
              {visualTitle}
            </h1>
            <p className="mt-6 max-w-2xl text-lg leading-8 text-white/78">
              {visualDescription}
            </p>
          </div>
        </div>
      </section>

      <section className="flex min-h-screen items-center justify-center px-5 py-8 sm:px-8 lg:px-10 xl:px-12">
        <div className="w-full max-w-lg rounded-[2rem] border border-black/5 bg-white/92 p-7 shadow-[0_30px_80px_rgba(15,23,42,0.12)] backdrop-blur xl:p-8">
          <div className="flex items-center gap-3 lg:hidden">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-violet-600 text-xl font-bold text-white shadow-sm">
              N
            </div>
            <div>
              <p className="text-xs uppercase tracking-[0.28em] text-gray-400">{badge}</p>
              <p className="text-xl font-semibold tracking-tight text-gray-950">Niural</p>
            </div>
          </div>

          <div className="mt-8 lg:mt-0">
            <p className="text-xs uppercase tracking-[0.3em] text-gray-400">{badge}</p>
            <h2 className="mt-3 text-3xl font-semibold tracking-[-0.04em] text-gray-950">
              {title}
            </h2>
            <p className="mt-3 text-sm leading-6 text-gray-500">{description}</p>
          </div>

          <div className="mt-8">{children}</div>
        </div>
      </section>
    </div>
  );
}

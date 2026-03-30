import Link from "next/link";

import { cn } from "@/lib/utils";

export async function SiteHeader({ className }: { className?: string }) {
  return (
    <header className={cn("sticky top-0 z-40 border-b border-gray-200 bg-white/95 backdrop-blur", className)}>
      <div className="mx-auto flex max-w-[1280px] items-center justify-between px-6 py-3">
        <Link href="/" className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-violet-200 bg-violet-50 text-xs font-bold text-violet-700">
            N
          </div>
          <span className="text-sm font-semibold text-gray-900">Niural</span>
        </Link>
        <div className="flex items-center gap-3">
          <Link
            href="/auth/sign-in"
            className="rounded-lg bg-[linear-gradient(135deg,#7c3aed,#5b21b6)] px-4 py-2 text-sm font-semibold text-white transition hover:opacity-95"
          >
            Candidate Login
          </Link>
        </div>
      </div>
    </header>
  );
}

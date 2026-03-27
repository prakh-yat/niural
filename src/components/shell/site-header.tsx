import Link from "next/link";

import { cn } from "@/lib/utils";

const navItems = [
  { href: "/", label: "Overview" },
  { href: "/careers", label: "Careers" },
  { href: "/candidate", label: "Candidate Portal" },
  { href: "/admin", label: "Admin" },
  { href: "/settings/integrations/google", label: "Integrations" },
];

export function SiteHeader({ className }: { className?: string }) {
  return (
    <header className={cn("sticky top-0 z-40 px-4 pt-4 md:px-6", className)}>
      <div className="glass-panel mx-auto flex max-w-[1360px] items-center justify-between rounded-[1.7rem] px-4 py-3 md:px-5">
        <Link href="/" className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-accent text-sm font-bold text-white shadow-[0_10px_28px_rgba(100,103,242,0.28)]">
            N
          </div>
          <div className="flex flex-col">
            <span className="text-sm font-semibold uppercase tracking-[0.2em] text-accent-strong">
              Niural
            </span>
            <span className="font-display text-lg tracking-[-0.04em] text-ink">TalentOS</span>
          </div>
        </Link>
        <nav className="hidden items-center gap-2 rounded-full bg-panel-strong/60 p-1 md:flex">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="rounded-full px-4 py-2 text-sm font-medium text-ink-soft transition hover:bg-white hover:text-ink"
            >
              {item.label}
            </Link>
          ))}
        </nav>
      </div>
    </header>
  );
}

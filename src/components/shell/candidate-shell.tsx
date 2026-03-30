"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BriefcaseBusiness, CalendarClock, CircleCheckBig, House } from "lucide-react";
import type { ReactNode } from "react";

import { cn, initials } from "@/lib/utils";

const navItems = [
  { href: "/", label: "Portal home", icon: House },
  { href: "/interviews", label: "Interviews", icon: CalendarClock },
  { href: "/offers", label: "Offers", icon: BriefcaseBusiness },
];

const milestones = [
  "Application received",
  "AI screening",
  "Interview",
  "Offer",
  "Onboarding",
];

export function CandidateShell({
  children,
  adminPortalHref,
  careersHref,
  viewerName,
  isPreview,
}: {
  children: ReactNode;
  adminPortalHref: string;
  careersHref: string;
  viewerName: string;
  isPreview: boolean;
}) {
  const pathname = usePathname();

  return (
    <div className="min-h-screen bg-[#fafafa] text-gray-900">
      <div className="mx-auto flex min-h-screen max-w-[1440px] flex-col lg:flex-row">
        <aside className="border-b border-gray-200 bg-white px-5 py-5 lg:min-h-screen lg:w-[240px] lg:border-b-0 lg:border-r lg:px-4 lg:py-6">
          <div className="flex items-center justify-between gap-4 lg:flex-col lg:items-start">
            <div className="flex items-center gap-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-indigo-50 text-xs font-medium text-indigo-600">
                {initials(viewerName)}
              </div>
              <p className="text-sm font-semibold text-gray-900">{viewerName}</p>
            </div>
            {isPreview ? (
              <span className="rounded-md bg-amber-50 px-2 py-1 text-xs font-medium text-amber-600">
                Preview mode
              </span>
            ) : null}
          </div>

          <nav className="mt-6 grid gap-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const active =
                item.href === "/"
                  ? pathname === "/"
                  : pathname === item.href || pathname.startsWith(`${item.href}/`);

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "flex items-center gap-2.5 rounded-md px-3 py-2 text-sm transition",
                    active
                      ? "bg-gray-100 font-medium text-gray-900"
                      : "text-gray-500 hover:bg-gray-50 hover:text-gray-900",
                  )}
                >
                  <Icon className="h-4 w-4" />
                  {item.label}
                </Link>
              );
            })}
          </nav>

          <div className="mt-6 hidden lg:block">
            <p className="px-3 text-xs font-medium uppercase tracking-wider text-gray-400">
              Journey
            </p>
            <div className="mt-3 grid gap-2 px-3">
              {milestones.map((step) => (
                <div key={step} className="flex items-center gap-2 text-sm text-gray-400">
                  <CircleCheckBig className="h-3.5 w-3.5" />
                  {step}
                </div>
              ))}
            </div>
          </div>

          <div className="mt-6 hidden grid gap-1 lg:grid">
            <Link
              href={careersHref}
              className="rounded-md px-3 py-2 text-sm text-gray-400 transition hover:bg-gray-50 hover:text-gray-600"
            >
              View careers
            </Link>
            <Link
              href={adminPortalHref}
              className="rounded-md px-3 py-2 text-sm text-gray-400 transition hover:bg-gray-50 hover:text-gray-600"
            >
              Admin portal
            </Link>
          </div>
        </aside>

        <div className="flex flex-1 flex-col">
          <header className="border-b border-gray-200 bg-white px-6 py-4">
            <h2 className="text-lg font-semibold text-gray-900">
              Welcome back, {viewerName.split(" ")[0]}
            </h2>
          </header>

          <main className="flex-1 px-6 py-6">{children}</main>
        </div>
      </div>
    </div>
  );
}

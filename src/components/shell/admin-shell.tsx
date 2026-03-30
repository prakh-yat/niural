"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, PlugZap, Users, Waypoints } from "lucide-react";
import type { ReactNode } from "react";

import { cn, initials } from "@/lib/utils";

const navItems = [
  { href: "/", label: "Control room", icon: LayoutDashboard },
  { href: "/settings/integrations/google", label: "Calendar sync", icon: PlugZap },
];

export function AdminShell({
  children,
  candidatePortalHref,
  careersHref,
  viewerName,
  viewerRole,
  isPreview,
}: {
  children: ReactNode;
  candidatePortalHref: string;
  careersHref: string;
  viewerName: string;
  viewerRole: string;
  isPreview: boolean;
}) {
  const pathname = usePathname();

  return (
    <div className="min-h-screen bg-[#fafafa] text-gray-900">
      <div className="mx-auto flex min-h-screen max-w-[1440px]">
        <aside className="hidden w-[240px] shrink-0 border-r border-gray-200 bg-white px-4 py-6 lg:flex lg:flex-col">
          <div className="flex items-center gap-2.5 px-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gray-900 text-xs font-bold text-white">
              N
            </div>
            <div>
              <p className="text-sm font-semibold text-gray-900">Admin Portal</p>
            </div>
          </div>

          <nav className="mt-8 flex flex-col gap-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const active =
                pathname === item.href ||
                (item.href !== "/" && pathname.startsWith(`${item.href}/`));

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

          <div className="mt-auto grid gap-1">
            <Link
              href={candidatePortalHref}
              className="flex items-center gap-2.5 rounded-md px-3 py-2 text-sm text-gray-400 transition hover:bg-gray-50 hover:text-gray-600"
            >
              <Users className="h-4 w-4" />
              Candidate portal
            </Link>
            <Link
              href={careersHref}
              className="flex items-center gap-2.5 rounded-md px-3 py-2 text-sm text-gray-400 transition hover:bg-gray-50 hover:text-gray-600"
            >
              <Waypoints className="h-4 w-4" />
              Public careers
            </Link>
          </div>
        </aside>

        <div className="flex min-h-screen flex-1 flex-col">
          <header className="border-b border-gray-200 bg-white px-6 py-4">
            <div className="flex items-center justify-between">
              <h1 className="text-lg font-semibold text-gray-900">Hiring Dashboard</h1>
              <div className="flex items-center gap-2.5">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gray-100 text-xs font-medium text-gray-600">
                  {initials(viewerName)}
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-900">{viewerName}</p>
                  <p className="text-xs text-gray-400">
                    {isPreview ? "Preview" : viewerRole.replaceAll("_", " ")}
                  </p>
                </div>
              </div>
            </div>
          </header>

          <main className="flex-1 px-6 py-6">{children}</main>
        </div>
      </div>
    </div>
  );
}

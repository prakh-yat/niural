"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BriefcaseBusiness,
  LayoutDashboard,
  Workflow,
  Settings,
  LogOut,
  FileText,
} from "lucide-react";

const navItems = [
  { href: "/niural-admin", label: "Dashboard", icon: LayoutDashboard },
  { href: "/niural-admin/jobs", label: "Job Listings", icon: BriefcaseBusiness },
  { href: "/niural-admin/offers", label: "Draft Offers", icon: FileText },
  { href: "/niural-admin/pipeline", label: "Hiring Pipeline", icon: Workflow },
  { href: "/niural-admin/settings", label: "Settings", icon: Settings },
];

export function AdminSidebar({ userName }: { userName: string }) {
  const pathname = usePathname();

  return (
    <aside className="flex h-full w-60 flex-col border-r border-gray-200 bg-white">
      <div className="flex items-center gap-2 border-b border-gray-100 px-4 py-4">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-violet-600 text-white text-sm font-bold">
          N
        </div>
        <div>
          <span className="text-sm font-semibold text-gray-900">Niural</span>
          <span className="ml-1 text-[10px] font-medium text-violet-600 bg-violet-50 rounded px-1.5 py-0.5">Admin</span>
        </div>
      </div>

      <div className="px-4 py-4">
        <p className="text-xs font-medium text-gray-400">Signed in as</p>
        <p className="mt-1 text-sm font-semibold text-gray-900 truncate">{userName}</p>
      </div>

      <nav className="flex-1 px-2">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive =
            pathname === item.href ||
            (item.href !== "/niural-admin" && pathname.startsWith(item.href));
          return (
            <Link
              key={item.href}
              href={item.href}
              prefetch={false}
              className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition ${
                isActive
                  ? "bg-violet-50 text-violet-700"
                  : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
              }`}
            >
              <Icon className="h-4 w-4" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-gray-100 p-2">
        <form action="/api/auth/sign-out" method="post">
          <input type="hidden" name="role" value="admin" />
          <button
            type="submit"
            className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-gray-500 hover:bg-gray-50 hover:text-gray-700"
          >
            <LogOut className="h-4 w-4" />
            Sign out
          </button>
        </form>
      </div>
    </aside>
  );
}

"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Briefcase, Calendar, FileText, Settings, LogOut } from "lucide-react";

const navItems = [
  { href: "/app", label: "Jobs", icon: LayoutDashboard },
  { href: "/app/applied-jobs", label: "Applied Jobs", icon: Briefcase },
  { href: "/app/interviews", label: "Interviews", icon: Calendar },
  { href: "/app/offers", label: "Offers", icon: FileText },
  { href: "/app/settings", label: "Settings", icon: Settings },
];

export function CandidateSidebar({ userName }: { userName: string }) {
  const pathname = usePathname();

  return (
    <aside className="flex h-full w-60 flex-col border-r border-gray-200 bg-white">
      <div className="flex items-center gap-2 border-b border-gray-100 px-4 py-4">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-violet-600 text-white text-sm font-bold">
          N
        </div>
        <span className="text-sm font-semibold text-gray-900">Niural</span>
      </div>

      <div className="px-4 py-4">
        <p className="text-xs font-medium text-gray-400">Welcome</p>
        <p className="mt-1 text-sm font-semibold text-gray-900 truncate">{userName}</p>
      </div>

      <nav className="flex-1 px-2">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href || (item.href !== "/app" && pathname.startsWith(item.href));
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
          <input type="hidden" name="role" value="candidate" />
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

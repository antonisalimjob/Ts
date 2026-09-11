"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  LifeBuoy,
  LogOut,
  Plus,
  Ticket,
  UserRound,
  Users,
} from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import { ROLE_LABEL } from "@/lib/constants";
import { canManageUsers } from "@/lib/permissions";
import { cn } from "@/lib/utils";
import type { SessionUser } from "@/lib/auth";

const nav = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/tickets", label: "Tickets", icon: Ticket },
  { href: "/tickets/new", label: "New ticket", icon: Plus },
  { href: "/settings/profile", label: "Account", icon: UserRound },
];

export function AppShell({
  user,
  children,
}: {
  user: SessionUser;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();

  return (
    <div className="flex min-h-screen bg-[#eef1f6]">
      <aside className="flex w-[248px] shrink-0 flex-col bg-[#0b1220] text-slate-300">
        <div className="flex items-center gap-3 px-5 py-5">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-teal-500 text-slate-950">
            <LifeBuoy className="h-5 w-5" />
          </div>
          <div>
            <p className="text-sm font-semibold text-white">Nexus SM</p>
            <p className="text-[11px] text-slate-400">IT Service Management</p>
          </div>
        </div>
        <nav className="flex-1 space-y-1 px-3">
          {nav.map((item) => {
            const active =
              item.href === "/dashboard"
                ? pathname === "/" || pathname.startsWith("/dashboard")
                : item.href === "/tickets"
                  ? pathname === "/tickets" ||
                    (pathname.startsWith("/tickets/") && !pathname.startsWith("/tickets/new"))
                  : item.href === "/settings/profile"
                    ? pathname.startsWith("/settings")
                    : pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium",
                  active ? "bg-white/10 text-white" : "hover:bg-white/5 hover:text-white",
                )}
              >
                <item.icon className="h-4 w-4" />
                {item.label}
              </Link>
            );
          })}
          {canManageUsers(user.role) ? (
            <Link
              href="/admin/teams"
              className={cn(
                "flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium",
                pathname.startsWith("/admin")
                  ? "bg-white/10 text-white"
                  : "hover:bg-white/5 hover:text-white",
              )}
            >
              <Users className="h-4 w-4" />
              Team & roles
            </Link>
          ) : null}
        </nav>
        <div className="border-t border-white/10 p-4">
          <div className="flex items-center gap-3">
            <Avatar name={user.name} src={user.avatarUrl} />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-white">{user.name}</p>
              <p className="truncate text-[11px] text-slate-400">{ROLE_LABEL[user.role]}</p>
            </div>
            <button
              type="button"
              className="rounded-md p-1.5 text-slate-400 hover:bg-white/10 hover:text-white"
              title="Sign out"
              onClick={async () => {
                await fetch("/api/auth/logout", { method: "POST" });
                router.push("/login");
                router.refresh();
              }}
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>
      </aside>
      <div className="flex min-w-0 flex-1 flex-col">
        <main className="flex min-h-0 flex-1 flex-col p-6">{children}</main>
      </div>
    </div>
  );
}

"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import {
  LayoutDashboard,
  FileText,
  ScanSearch,
  FolderOpen,
  LayoutTemplate,
  Activity,
  CreditCard,
  Settings,
  Sparkles,
  ChevronDown,
  ChevronsLeft,
  ChevronsRight,
  LogOut,
} from "lucide-react";
import { useAuth } from "@/components/providers/auth-provider";
import { Button } from "@/components/ui/button";
import { IconTooltip } from "@/components/ui/tooltip";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

export const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/dashboard/proposals", label: "Proposals", icon: FileText },
  { href: "/dashboard/rfp-analyzer", label: "RFP Analyzer", icon: ScanSearch },
  { href: "/dashboard/documents", label: "Documents", icon: FolderOpen },
  { href: "/dashboard/templates", label: "Templates", icon: LayoutTemplate },
  { href: "/dashboard/activity", label: "Activity", icon: Activity },
  { href: "/dashboard/billing", label: "Billing", icon: CreditCard },
];

const COLLAPSE_KEY = "rfp_sidebar_collapsed";

export function Sidebar() {
  const pathname = usePathname();
  const { user, organizations, currentOrg, setCurrentOrgId, logout } = useAuth();
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem(COLLAPSE_KEY);
    if (stored === "1") setCollapsed(true);
  }, []);

  function toggleCollapsed() {
    setCollapsed((prev) => {
      const next = !prev;
      localStorage.setItem(COLLAPSE_KEY, next ? "1" : "0");
      return next;
    });
  }

  const displayName = user
    ? `${user.firstName} ${user.lastName}`.trim() || user.email
    : "User";

  return (
    <aside
      className={cn(
        "hidden shrink-0 flex-col bg-slate-900 text-slate-100 transition-[width] md:flex",
        collapsed ? "w-[72px]" : "w-60"
      )}
    >
      <div className="flex h-16 items-center justify-between gap-2 border-b border-slate-800 px-3">
        <div className="flex min-w-0 items-center gap-2">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-slate-700">
            <Sparkles className="h-4 w-4" />
          </div>
          {!collapsed && (
            <span className="truncate text-sm font-semibold tracking-tight">RFP Copilot</span>
          )}
        </div>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-8 w-8 shrink-0 text-slate-300 hover:bg-slate-800 hover:text-white"
          onClick={toggleCollapsed}
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {collapsed ? <ChevronsRight className="h-4 w-4" /> : <ChevronsLeft className="h-4 w-4" />}
        </Button>
      </div>

      <div className="border-b border-slate-800 p-3">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              className={cn(
                "flex w-full items-center gap-2 rounded-md bg-slate-800/80 px-2 py-2 text-left text-sm hover:bg-slate-800",
                collapsed && "justify-center px-0"
              )}
            >
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded bg-slate-700 text-xs font-semibold">
                {(currentOrg?.name ?? "O").charAt(0).toUpperCase()}
              </span>
              {!collapsed && (
                <>
                  <span className="min-w-0 flex-1 truncate font-medium">
                    {currentOrg?.name ?? "Select org"}
                  </span>
                  <ChevronDown className="h-4 w-4 shrink-0 text-slate-400" />
                </>
              )}
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-56">
            <DropdownMenuLabel>Organizations</DropdownMenuLabel>
            <DropdownMenuSeparator />
            {organizations.length === 0 ? (
              <DropdownMenuItem disabled>No organizations</DropdownMenuItem>
            ) : (
              organizations.map((org) => (
                <DropdownMenuItem
                  key={org.id}
                  onClick={() => setCurrentOrgId(org.id)}
                  className={org.id === currentOrg?.id ? "bg-accent" : undefined}
                >
                  {org.name}
                </DropdownMenuItem>
              ))
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <nav className="flex flex-1 flex-col gap-1 p-3">
        {navItems.map(({ href, label, icon: Icon }) => {
          const isActive =
            pathname === href ||
            (href !== "/dashboard" && pathname.startsWith(href));

          return (
            <Link
              key={href}
              href={href}
              title={label}
              className={cn(
                "flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors",
                collapsed && "justify-center px-2",
                isActive
                  ? "bg-slate-700 text-white"
                  : "text-slate-300 hover:bg-slate-800 hover:text-white"
              )}
            >
              <Icon className="h-4 w-4 shrink-0" />
              {!collapsed && label}
            </Link>
          );
        })}
      </nav>

      <div className="mt-auto space-y-1 border-t border-slate-800 p-3">
        <Link
          href="/dashboard/settings"
          title="Settings"
          className={cn(
            "flex items-center gap-3 rounded-md px-3 py-2 text-sm text-slate-300 transition-colors hover:bg-slate-800 hover:text-white",
            collapsed && "justify-center px-2",
            pathname.startsWith("/dashboard/settings") && "bg-slate-700 text-white"
          )}
        >
          <Settings className="h-4 w-4 shrink-0" />
          {!collapsed && "Settings"}
        </Link>

        <div
          className={cn(
            "flex items-center gap-2 rounded-md px-2 py-2 text-sm text-slate-300",
            collapsed && "justify-center"
          )}
        >
          {!collapsed && <span className="min-w-0 flex-1 truncate">{displayName}</span>}
          <IconTooltip label="Log out">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-slate-300 hover:bg-slate-800 hover:text-white"
              onClick={() => void logout()}
              aria-label="Log out"
              title="Log out"
            >
              <LogOut className="h-4 w-4" />
            </Button>
          </IconTooltip>
        </div>
      </div>
    </aside>
  );
}

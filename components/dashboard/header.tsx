"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Bell } from "lucide-react";
import { MobileNav } from "@/components/dashboard/mobile-nav";
import { useAuth } from "@/components/providers/auth-provider";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
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

const titles: Record<string, string> = {
  "/dashboard": "Dashboard",
  "/dashboard/proposals": "Proposals",
  "/dashboard/rfp-analyzer": "RFP Analyzer",
  "/dashboard/documents": "Documents",
  "/dashboard/templates": "Templates",
  "/dashboard/activity": "Activity",
  "/dashboard/billing": "Billing",
  "/dashboard/settings": "Settings",
};

function crumbLabel(pathname: string): string {
  return titles[pathname] ?? pathname.split("/").filter(Boolean).pop()?.replace(/-/g, " ") ?? "Dashboard";
}

export function Header() {
  const pathname = usePathname();
  const { user, currentOrg, logout } = useAuth();
  const title = crumbLabel(pathname);
  const initials = user
    ? `${user.firstName?.[0] ?? ""}${user.lastName?.[0] ?? ""}`.toUpperCase() ||
      user.email.charAt(0).toUpperCase()
    : "U";

  return (
    <header className="flex h-16 shrink-0 items-center justify-between gap-4 border-b border-slate-200 bg-white px-3 sm:px-6">
      <MobileNav />
      <nav aria-label="Breadcrumb" className="min-w-0 flex-1">
        <ol className="flex items-center gap-2 text-sm text-slate-500">
          <li className="hidden truncate font-medium text-slate-900 sm:block">{currentOrg?.name ?? "Workspace"}</li>
          <li aria-hidden className="hidden sm:block">/</li>
          <li className="truncate capitalize text-slate-700">{title}</li>
        </ol>
      </nav>

      <div className="flex items-center gap-2">
        <IconTooltip label="Notifications">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="text-slate-600"
            aria-label="Notifications"
          >
            <Bell className="h-4 w-4" />
          </Button>
        </IconTooltip>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button type="button" className="rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400">
              <Avatar className="h-9 w-9">
                <AvatarFallback className="bg-slate-200 text-sm font-medium text-slate-700">
                  {initials}
                </AvatarFallback>
              </Avatar>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-52">
            <DropdownMenuLabel className="font-normal">
              <div className="flex flex-col space-y-1">
                <p className="text-sm font-medium">
                  {user ? `${user.firstName} ${user.lastName}`.trim() : "Account"}
                </p>
                <p className="text-xs text-muted-foreground">{user?.email}</p>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <Link href="/dashboard/settings">Profile</Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link href="/dashboard/billing">Billing</Link>
            </DropdownMenuItem>
            {user?.isSuperAdmin && (
              <DropdownMenuItem asChild>
                <Link href="/admin">Admin panel</Link>
              </DropdownMenuItem>
            )}
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={() => {
                void logout();
              }}
            >
              Sign out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}

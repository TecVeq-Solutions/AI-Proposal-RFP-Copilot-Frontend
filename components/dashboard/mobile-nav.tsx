"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LogOut, Menu, Settings, Sparkles } from "lucide-react";
import { useAuth } from "@/components/providers/auth-provider";
import { navItems } from "@/components/dashboard/sidebar";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { cn } from "@/lib/utils";

/** Day 54: below the md breakpoint the sidebar is hidden; this hamburger opens the same nav in a drawer. */
export function MobileNav() {
  const pathname = usePathname();
  const { user, currentOrg, logout } = useAuth();
  const [open, setOpen] = useState(false);

  const linkClass = (active: boolean) =>
    cn(
      "flex min-h-[44px] items-center gap-3 rounded-md px-3 text-sm transition-colors",
      active ? "bg-slate-700 text-white" : "text-slate-300 hover:bg-slate-800 hover:text-white"
    );

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-11 w-11 shrink-0 text-slate-700 md:hidden"
          aria-label="Open navigation"
        >
          <Menu className="h-5 w-5" />
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="flex w-72 flex-col border-slate-800 bg-slate-900 p-4 text-slate-100">
        <SheetHeader className="text-left">
          <SheetTitle className="flex items-center gap-2 text-slate-100">
            <span className="flex h-8 w-8 items-center justify-center rounded-md bg-slate-700">
              <Sparkles className="h-4 w-4" />
            </span>
            RFP Copilot
          </SheetTitle>
          <SheetDescription className="truncate text-slate-400">{currentOrg?.name ?? "Workspace"}</SheetDescription>
        </SheetHeader>

        <nav className="mt-4 flex flex-1 flex-col gap-1" aria-label="Main">
          {navItems.map(({ href, label, icon: Icon }) => {
            const active = pathname === href || (href !== "/dashboard" && pathname.startsWith(href));
            return (
              <Link key={href} href={href} onClick={() => setOpen(false)} className={linkClass(active)}>
                <Icon className="h-4 w-4 shrink-0" />
                {label}
              </Link>
            );
          })}
        </nav>

        <div className="space-y-1 border-t border-slate-800 pt-3">
          <Link
            href="/dashboard/settings"
            onClick={() => setOpen(false)}
            className={linkClass(pathname.startsWith("/dashboard/settings"))}
          >
            <Settings className="h-4 w-4 shrink-0" />
            Settings
          </Link>
          <button
            type="button"
            onClick={() => void logout()}
            className={cn(linkClass(false), "w-full text-left")}
          >
            <LogOut className="h-4 w-4 shrink-0" />
            <span className="min-w-0 flex-1 truncate">
              Log out{user ? ` (${user.firstName || user.email})` : ""}
            </span>
          </button>
        </div>
      </SheetContent>
    </Sheet>
  );
}

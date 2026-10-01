"use client";

import { usePathname, useRouter } from "next/navigation";
import { Command } from "cmdk";
import { requestNewProposal } from "@/lib/new-proposal-event";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import {
  Activity,
  CreditCard,
  FilePlus2,
  FileText,
  FolderUp,
  LayoutDashboard,
  ScanSearch,
  Settings,
  UserPlus,
  type LucideIcon,
} from "lucide-react";

interface PaletteAction {
  label: string;
  href?: string;
  icon: LucideIcon;
  keywords?: string;
  isNewProposal?: boolean;
}

const ACTIONS: PaletteAction[] = [
  { label: "New Proposal", icon: FilePlus2, keywords: "create proposal", isNewProposal: true },
  { label: "Analyze RFP", href: "/dashboard/rfp-analyzer", icon: ScanSearch, keywords: "rfp analysis" },
  { label: "Upload Document", href: "/dashboard/documents", icon: FolderUp, keywords: "pdf docx file" },
  { label: "Go to Dashboard", href: "/dashboard", icon: LayoutDashboard, keywords: "home" },
  { label: "Go to Proposals", href: "/dashboard/proposals", icon: FileText },
  { label: "Settings", href: "/dashboard/settings", icon: Settings, keywords: "profile" },
  { label: "Billing", href: "/dashboard/billing", icon: CreditCard, keywords: "plan usage invoices subscription upgrade" },
  { label: "Activity", href: "/dashboard/activity", icon: Activity, keywords: "log feed history" },
  { label: "Invite Team Member", href: "/dashboard/settings", icon: UserPlus, keywords: "team invite member" },
];

export function CommandPalette({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const router = useRouter();
  const pathname = usePathname();

  function run(action: PaletteAction) {
    onOpenChange(false);
    if (action.isNewProposal) requestNewProposal(pathname, router);
    else if (action.href) router.push(action.href);
  }

  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-black/50 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
        <DialogPrimitive.Content
          aria-describedby={undefined}
          className="fixed left-1/2 top-[20%] z-50 w-full max-w-lg -translate-x-1/2 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-2xl"
        >
          <DialogPrimitive.Title className="sr-only">Command palette</DialogPrimitive.Title>
          <Command label="Command palette">
            <Command.Input
              autoFocus
              placeholder="Type a command or search…"
              aria-label="Search commands"
              className="w-full border-b border-slate-200 px-4 py-3 text-sm outline-none placeholder:text-slate-500"
            />
            <Command.List className="max-h-72 overflow-y-auto p-2">
              <Command.Empty className="px-3 py-6 text-center text-sm text-slate-500">
                No matching commands.
              </Command.Empty>
              {ACTIONS.map((action) => (
                <Command.Item
                  key={action.label}
                  value={`${action.label} ${action.keywords ?? ""}`}
                  onSelect={() => run(action)}
                  className="flex cursor-pointer items-center gap-3 rounded-md px-3 py-2 text-sm text-slate-800 data-[selected=true]:bg-slate-100"
                >
                  <action.icon className="h-4 w-4 text-slate-500" />
                  {action.label}
                </Command.Item>
              ))}
            </Command.List>
          </Command>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}

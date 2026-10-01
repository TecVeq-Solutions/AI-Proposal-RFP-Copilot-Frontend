import type { LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description?: string;
  action?: { label: string; onClick: () => void };
}

export function EmptyState({ icon: Icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-lg border border-dashed border-slate-300 bg-white px-6 py-12 text-center">
      <div className="rounded-full bg-slate-100 p-3">
        <Icon className="h-6 w-6 text-slate-500" />
      </div>
      <h3 className="text-base font-semibold text-slate-900">{title}</h3>
      {description && <p className="max-w-sm text-sm text-slate-600">{description}</p>}
      {action && (
        <Button type="button" onClick={action.onClick}>
          {action.label}
        </Button>
      )}
    </div>
  );
}

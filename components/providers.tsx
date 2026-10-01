"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState } from "react";
import { ConfirmProvider } from "@/components/confirm-provider";
import { ErrorBoundary } from "@/components/error-boundary";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { UpgradePromptModal } from "@/components/upgrade-prompt-modal";

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => new QueryClient());

  return (
    <QueryClientProvider client={queryClient}>
      <ErrorBoundary>
        <TooltipProvider delayDuration={200}>
          <ConfirmProvider>{children}</ConfirmProvider>
        </TooltipProvider>
        <UpgradePromptModal />
        <Toaster richColors position="bottom-right" />
      </ErrorBoundary>
    </QueryClientProvider>
  );
}

"use client";

import { Component, type ErrorInfo, type ReactNode } from "react";
import * as Sentry from "@sentry/nextjs";
import { Button } from "@/components/ui/button";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  message: string;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, message: "" };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, message: error.message || "Something went wrong." };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("ErrorBoundary caught:", error, info);
    // Day 71: no-op when Sentry has no DSN configured.
    Sentry.captureException(error, { extra: { componentStack: info.componentStack } });
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="mx-auto flex min-h-[40vh] max-w-lg flex-col items-center justify-center gap-4 px-4 text-center">
          <h2 className="text-xl font-semibold text-slate-900">Something went wrong</h2>
          <p className="text-sm text-slate-600">{this.state.message}</p>
          <Button
            type="button"
            onClick={() => {
              this.setState({ hasError: false, message: "" });
              window.location.reload();
            }}
          >
            Reload page
          </Button>
        </div>
      );
    }

    return this.props.children;
  }
}

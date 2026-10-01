import { ErrorBoundary } from "@/components/error-boundary";
import { AuthProvider } from "@/components/providers/auth-provider";
import { Header } from "@/components/dashboard/header";
import { Sidebar } from "@/components/dashboard/sidebar";
import { DashboardShortcuts } from "@/components/dashboard/dashboard-shortcuts";
import { FeedbackWidget } from "@/components/dashboard/feedback-widget";
import { ImpersonationBanner } from "@/components/dashboard/impersonation-banner";
import { TrialBanner, TrialExpiredModal } from "@/components/dashboard/trial-status";
import { OnboardingWizard } from "@/components/onboarding/OnboardingWizard";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AuthProvider>
      <div className="flex min-h-screen bg-slate-50">
        <Sidebar />
        <div className="flex min-w-0 flex-1 flex-col">
          <ImpersonationBanner />
          <TrialBanner />
          <Header />
          <main className="flex-1 p-4 sm:p-6">
            <ErrorBoundary>{children}</ErrorBoundary>
          </main>
        </div>
      </div>
      <DashboardShortcuts />
      <FeedbackWidget />
      <TrialExpiredModal />
      <OnboardingWizard />
    </AuthProvider>
  );
}

import { Sparkles } from "lucide-react";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-br from-slate-100 via-white to-slate-200 px-4 py-10">
      <div className="mb-8 flex items-center gap-2 text-slate-900">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-slate-900 text-white">
          <Sparkles className="h-5 w-5" />
        </div>
        <span className="text-xl font-semibold tracking-tight">RFP Copilot</span>
      </div>
      <div className="w-full max-w-md">{children}</div>
    </div>
  );
}

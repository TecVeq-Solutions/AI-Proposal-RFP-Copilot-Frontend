"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useDropzone } from "react-dropzone";
import { toast } from "sonner";
import { FileSearch, FileText, Loader2, Sparkles, UploadCloud, Wand2 } from "lucide-react";
import { useAuth } from "@/components/providers/auth-provider";
import { Button } from "@/components/ui/button";
import api from "@/lib/api";
import { cn } from "@/lib/utils";
import type { ApiResponse, DocumentItem, RfpAnalysis, User } from "@/types/api";

const MAX_BYTES = 25 * 1024 * 1024;
const LAST_STEP = 3;
const POLL_MS = 3000;
const POLL_ATTEMPTS = 40;

const ACCEPT = {
  "application/pdf": [".pdf"],
  "application/msword": [".doc"],
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": [".docx"],
};

function statusLabel(status: unknown): string {
  return typeof status === "number"
    ? (["Uploaded", "Processing", "Ready", "Failed"][status] ?? String(status))
    : String(status);
}

function saveProgress(step: number, completed = false) {
  return api.patch<ApiResponse<User>>(
    "/api/auth/onboarding",
    { step, completed },
    { skipErrorToast: true }
  );
}

/**
 * Day 68: first-run wizard. Progress is persisted server-side (OnboardingStep), so a refresh resumes
 * where the user left off; it never shows again once OnboardingCompletedAt is set.
 * Steps: 0 Welcome (not skippable) → 1 Upload → 2 Analyze → 3 Done.
 */
export function OnboardingWizard() {
  const router = useRouter();
  const { user, currentOrg, loading, refresh } = useAuth();
  const orgId = currentOrg?.id;

  const [step, setStep] = useState(0);
  const [initialised, setInitialised] = useState(false);
  const [finished, setFinished] = useState(false);
  const [uploaded, setUploaded] = useState<DocumentItem | null>(null);
  const [busy, setBusy] = useState<"upload" | "analyze" | "finish" | null>(null);
  const cancelled = useRef(false);

  useEffect(() => {
    cancelled.current = false;
    return () => {
      cancelled.current = true;
    };
  }, []);

  // Resume from the saved step exactly once. Wait for loading to finish: before that the user is only
  // a stub decoded from the JWT and has no onboarding fields yet.
  useEffect(() => {
    if (user && !loading && !initialised) {
      setStep(Math.min(Math.max(user.onboardingStep ?? 0, 0), LAST_STEP));
      setInitialised(true);
    }
  }, [user, loading, initialised]);

  const goTo = useCallback((next: number) => {
    setStep(next);
    // Persisting is best-effort; the wizard keeps working even if the save fails.
    void saveProgress(next).catch(() => undefined);
  }, []);

  const onDrop = useCallback(
    async (files: File[]) => {
      const file = files[0];
      if (!file || !orgId) return;
      if (file.size > MAX_BYTES) {
        toast.error("File is too large (max 25 MB).");
        return;
      }
      setBusy("upload");
      try {
        const form = new FormData();
        form.append("file", file);
        form.append("type", "Rfp");
        const res = await api.post<ApiResponse<DocumentItem>>(
          `/api/organizations/${orgId}/documents/upload`,
          form,
          { headers: { "Content-Type": "multipart/form-data" } }
        );
        if (res.data.data) {
          setUploaded(res.data.data);
          toast.success("Document uploaded!");
          goTo(2);
        }
      } catch {
        // The global Axios interceptor already shows the error toast.
      } finally {
        setBusy(null);
      }
    },
    [orgId, goTo]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop: (files) => void onDrop(files),
    accept: ACCEPT,
    multiple: false,
    disabled: busy !== null,
    onDropRejected: () => toast.error("Please upload a PDF or Word document."),
  });

  async function analyze() {
    if (!orgId || !uploaded) return;
    setBusy("analyze");
    try {
      // Analysis needs a fully processed document, so wait for it to become Ready.
      let ready = statusLabel(uploaded.status) === "Ready";
      for (let i = 0; !ready && i < POLL_ATTEMPTS && !cancelled.current; i++) {
        await new Promise((r) => setTimeout(r, POLL_MS));
        const res = await api.get<ApiResponse<DocumentItem>>(
          `/api/organizations/${orgId}/documents/${uploaded.id}`,
          { skipErrorToast: true }
        );
        const label = statusLabel(res.data.data?.status);
        if (label === "Failed") throw new Error("Processing failed");
        ready = label === "Ready";
      }
      if (!ready) {
        toast.error("Your document is still processing. You can analyze it later from the RFP Analyzer.");
        return;
      }

      await api.post<ApiResponse<RfpAnalysis>>(`/api/organizations/${orgId}/rfp-analyses`, {
        documentId: uploaded.id,
      });
      toast.success("RFP analysis started!");
      goTo(3);
    } catch {
      toast.error("Could not start the analysis. You can try again from the RFP Analyzer.");
    } finally {
      if (!cancelled.current) setBusy(null);
    }
  }

  async function finish() {
    setBusy("finish");
    try {
      await saveProgress(LAST_STEP, true);
      setFinished(true);
      await refresh();
      router.push("/dashboard");
    } catch {
      toast.error("Could not save your progress. Please try again.");
      setBusy(null);
    }
  }

  const shouldShow =
    !loading && Boolean(user) && Boolean(currentOrg) && !user?.onboardingCompletedAt && !finished && initialised;
  if (!shouldShow || !user) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="onboarding-title"
    >
      <div className="w-full max-w-lg space-y-6 rounded-xl bg-white p-6 shadow-xl sm:p-8">
        {step === 0 && (
          <div className="space-y-5">
            <h2 id="onboarding-title" className="text-2xl font-semibold text-slate-900">
              👋 Welcome to RFP Copilot{user.firstName ? `, ${user.firstName}` : ""}!
            </h2>
            <p className="text-sm text-slate-600">
              You have a 14-day trial with full Professional features.
            </p>
            <ul className="space-y-3 text-sm text-slate-700">
              <li className="flex items-start gap-3">
                <FileSearch className="mt-0.5 h-5 w-5 shrink-0 text-blue-600" aria-hidden />
                <span>
                  <strong>Analyze RFPs</strong> — AI extracts every requirement, deadline and criterion.
                </span>
              </li>
              <li className="flex items-start gap-3">
                <Wand2 className="mt-0.5 h-5 w-5 shrink-0 text-violet-600" aria-hidden />
                <span>
                  <strong>Write proposals</strong> — generate drafts and refine them with slash commands.
                </span>
              </li>
              <li className="flex items-start gap-3">
                <FileText className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600" aria-hidden />
                <span>
                  <strong>Stay compliant</strong> — track a compliance matrix and export to Excel.
                </span>
              </li>
            </ul>
            <Button className="w-full" onClick={() => goTo(1)}>
              Let&apos;s get you set up →
            </Button>
          </div>
        )}

        {step === 1 && (
          <div className="space-y-5">
            <h2 id="onboarding-title" className="text-xl font-semibold text-slate-900">
              Upload your first RFP or proposal
            </h2>
            <div
              {...getRootProps()}
              className={cn(
                "flex cursor-pointer flex-col items-center gap-2 rounded-lg border-2 border-dashed px-4 py-10 text-center transition-colors",
                isDragActive ? "border-blue-500 bg-blue-50" : "border-slate-300 hover:bg-slate-50",
                busy === "upload" && "pointer-events-none opacity-60"
              )}
            >
              <input {...getInputProps()} aria-label="Upload a PDF or Word document" />
              {busy === "upload" ? (
                <Loader2 className="h-8 w-8 animate-spin text-slate-500" aria-hidden />
              ) : (
                <UploadCloud className="h-8 w-8 text-slate-500" aria-hidden />
              )}
              <p className="text-sm font-medium text-slate-700">
                {busy === "upload" ? "Uploading…" : "Drag & drop a PDF or Word file, or click to browse"}
              </p>
              <p className="text-xs text-slate-500">PDF, DOC or DOCX up to 25 MB</p>
            </div>
            <div className="text-center">
              <button
                type="button"
                className="text-xs text-slate-500 underline hover:text-slate-700"
                disabled={busy !== null}
                onClick={() => goTo(2)}
              >
                Skip for now
              </button>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-5">
            <h2 id="onboarding-title" className="text-xl font-semibold text-slate-900">
              Try the RFP Analyzer
            </h2>
            {uploaded ? (
              <>
                <p className="text-sm text-slate-600">
                  Let AI pull the requirements out of <strong className="break-all">{uploaded.name}</strong>.
                  This usually takes about a minute.
                </p>
                <Button className="w-full" onClick={() => void analyze()} disabled={busy !== null}>
                  {busy === "analyze" ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden />
                      Preparing your document…
                    </>
                  ) : (
                    <>Analyze {uploaded.name}</>
                  )}
                </Button>
              </>
            ) : (
              <p className="text-sm text-slate-600">
                Upload a document first and you can analyze it here — or open the RFP Analyzer any time from the
                sidebar.
              </p>
            )}
            <div className="text-center">
              <button
                type="button"
                className="text-xs text-slate-500 underline hover:text-slate-700"
                disabled={busy === "analyze"}
                onClick={() => goTo(3)}
              >
                Skip for now
              </button>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-5">
            <h2 id="onboarding-title" className="text-2xl font-semibold text-slate-900">
              🎉 You&apos;re ready to win more RFPs!
            </h2>
            <ul className="space-y-2 text-sm text-slate-700">
              <li className="flex items-start gap-2">
                <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" aria-hidden />
                Press <kbd className="rounded border bg-slate-100 px-1 text-xs">Ctrl</kbd>+
                <kbd className="rounded border bg-slate-100 px-1 text-xs">K</kbd> for the command palette.
              </li>
              <li className="flex items-start gap-2">
                <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" aria-hidden />
                Type <code className="rounded bg-slate-100 px-1 text-xs">/</code> in the editor to improve, shorten or
                summarize text with AI.
              </li>
              <li className="flex items-start gap-2">
                <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" aria-hidden />
                Invite teammates from Settings to review and comment.
              </li>
            </ul>
            <Button className="w-full" onClick={() => void finish()} disabled={busy === "finish"}>
              {busy === "finish" ? <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden /> : null}
              Go to Dashboard
            </Button>
          </div>
        )}

        <div className="flex items-center justify-center gap-2" role="img" aria-label={`Step ${step + 1} of 4`}>
          {[0, 1, 2, 3].map((i) => (
            <span
              key={i}
              className={cn("h-2 w-2 rounded-full", i === step ? "bg-blue-600" : i < step ? "bg-blue-300" : "bg-slate-200")}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

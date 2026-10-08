"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useDropzone } from "react-dropzone";
import {
  AlertTriangle,
  Check,
  Loader2,
  Search,
  Trash2,
  Upload,
} from "lucide-react";
import { toast } from "sonner";
import { useConfirm } from "@/components/confirm-provider";
import { EmptyState } from "@/components/empty-state";
import { ErrorState } from "@/components/error-state";
import { DocumentRowSkeleton } from "@/components/skeletons";
import api from "@/lib/api";
import { useAuth } from "@/components/providers/auth-provider";
import type {
  ApiResponse,
  DocumentItem,
  DocumentListResponse,
  RfpAnalysis,
  RfpAnalysisListResponse,
  RfpAnalysisSummary,
} from "@/lib/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

const MAX_BYTES = 25 * 1024 * 1024;

function statusLabel(status: RfpAnalysisSummary["status"]): string {
  if (typeof status === "number") {
    return ["Pending", "Processing", "Completed", "Failed"][status] ?? String(status);
  }
  return String(status);
}

function formatRelative(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins} min ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} hour${hours === 1 ? "" : "s"} ago`;
  const days = Math.floor(hours / 24);
  return `${days} day${days === 1 ? "" : "s"} ago`;
}

type DateFilter = "all" | "week" | "month";

export default function RfpAnalyzerPage() {
  const { currentOrg, loading: authLoading } = useAuth();
  const confirm = useConfirm();
  const orgId = currentOrg?.id;
  const router = useRouter();

  const [readyRfps, setReadyRfps] = useState<DocumentItem[]>([]);
  const [selectedDocId, setSelectedDocId] = useState<string>("");
  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState("");
  const [uploading, setUploading] = useState(false);

  const [analyzingId, setAnalyzingId] = useState<string | null>(null);
  const [analyzingStatus, setAnalyzingStatus] = useState<RfpAnalysis["status"] | null>(null);
  const [analyzingError, setAnalyzingError] = useState<string | null>(null);

  const [history, setHistory] = useState<RfpAnalysisSummary[]>([]);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [historyError, setHistoryError] = useState(false);
  const [titleFilter, setTitleFilter] = useState("");
  const [dateFilter, setDateFilter] = useState<DateFilter>("all");

  const fetchReadyRfps = useCallback(async () => {
    if (!orgId) return;
    try {
      const res = await api.get<ApiResponse<DocumentListResponse>>(
        `/api/organizations/${orgId}/documents`,
        { params: { page: 1, pageSize: 100 } }
      );
      if (res.data.success && res.data.data) {
        setReadyRfps(
          res.data.data.items.filter(
            (d) =>
              String(d.type).toLowerCase() === "rfp" &&
              (String(d.status).toLowerCase() === "ready" || d.status === 2)
          )
        );
      }
    } catch {
      // non-fatal; upload-new-file flow still works
    }
  }, [orgId]);

  const fetchHistory = useCallback(async () => {
    if (!orgId) return;
    setHistoryError(false);
    try {
      const res = await api.get<ApiResponse<RfpAnalysisListResponse>>(
        `/api/organizations/${orgId}/rfp-analyses`,
        { params: { page: 1, pageSize: 50 } }
      );
      if (res.data.success && res.data.data) {
        setHistory(res.data.data.items);
      }
    } catch {
      // Error toast is shown by the global Axios interceptor (lib/api.ts).
      setHistoryError(true);
    } finally {
      setHistoryLoading(false);
    }
  }, [orgId]);

  useEffect(() => {
    if (!authLoading && orgId) {
      void fetchReadyRfps();
      void fetchHistory();
    }
  }, [authLoading, orgId, fetchReadyRfps, fetchHistory]);

  const onDrop = useCallback((accepted: File[]) => {
    const next = accepted[0];
    if (!next) return;
    if (next.size > MAX_BYTES) {
      toast.error("File exceeds 25MB limit");
      return;
    }
    setFile(next);
    setSelectedDocId("");
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    multiple: false,
    accept: {
      "application/pdf": [".pdf"],
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document": [".docx"],
      "application/msword": [".doc"],
    },
    maxSize: MAX_BYTES,
  });

  async function handleAnalyze() {
    if (!orgId) return;
    if (!file && !selectedDocId) {
      toast.error("Upload a file or select an existing RFP document");
      return;
    }

    setUploading(true);
    setAnalyzingError(null);
    try {
      let documentId = selectedDocId;

      if (file) {
        const form = new FormData();
        form.append("file", file);
        form.append("type", "Rfp");
        const uploadRes = await api.post<ApiResponse<DocumentItem>>(
          `/api/organizations/${orgId}/documents/upload`,
          form,
          { headers: { "Content-Type": "multipart/form-data" } }
        );
        if (!uploadRes.data.success || !uploadRes.data.data) {
          throw new Error(uploadRes.data.message || "Upload failed");
        }
        documentId = uploadRes.data.data.id;

        // New upload needs to finish extraction (Status=Ready) before it can be analyzed.
        for (let i = 0; i < 40; i++) {
          const check = await api.get<ApiResponse<DocumentItem>>(
            `/api/organizations/${orgId}/documents/${documentId}`
          );
          const status = String(check.data.data?.status ?? "").toLowerCase();
          if (status === "ready") break;
          if (status === "failed") throw new Error("Document text extraction failed.");
          await new Promise((r) => setTimeout(r, 2000));
        }
      }

      const createRes = await api.post<ApiResponse<RfpAnalysis>>(
        `/api/organizations/${orgId}/rfp-analyses`,
        { documentId, title: title.trim() || undefined }
      );

      if (!createRes.data.success || !createRes.data.data) {
        throw new Error(createRes.data.message || "Could not start analysis");
      }

      setAnalyzingId(createRes.data.data.id);
      setAnalyzingStatus(createRes.data.data.status);
    } catch {
      // Error toast is shown by the global Axios interceptor (lib/api.ts).
    } finally {
      setUploading(false);
    }
  }

  useEffect(() => {
    if (!analyzingId || !orgId) return;
    const id = window.setInterval(async () => {
      try {
        const res = await api.get<ApiResponse<RfpAnalysis>>(
          `/api/organizations/${orgId}/rfp-analyses/${analyzingId}`
        );
        const data = res.data.data;
        if (!data) return;
        setAnalyzingStatus(data.status);

        const statusStr = String(data.status).toLowerCase();
        if (statusStr === "completed" || data.status === 2) {
          window.clearInterval(id);
          router.push(`/dashboard/rfp-analyzer/${analyzingId}`);
        } else if (statusStr === "failed" || data.status === 3) {
          window.clearInterval(id);
          setAnalyzingError(data.errorMessage || "Analysis failed.");
        }
      } catch {
        // keep polling; transient network errors shouldn't stop the flow
      }
    }, 3000);
    return () => window.clearInterval(id);
  }, [analyzingId, orgId, router]);

  async function handleDeleteAnalysis(a: RfpAnalysisSummary) {
    if (!orgId) return;
    if (!(await confirm({ description: `Delete analysis "${a.title}"?` }))) return;
    try {
      await api.delete(`/api/organizations/${orgId}/rfp-analyses/${a.id}`);
      toast.success("Analysis deleted");
      await fetchHistory();
    } catch {
      // Error toast is shown by the global Axios interceptor (lib/api.ts).
    }
  }

  const filteredHistory = useMemo(() => {
    let items = history;
    if (titleFilter.trim()) {
      const q = titleFilter.trim().toLowerCase();
      items = items.filter((h) => h.title.toLowerCase().includes(q));
    }
    if (dateFilter !== "all") {
      const cutoff = Date.now() - (dateFilter === "week" ? 7 : 30) * 24 * 60 * 60 * 1000;
      items = items.filter((h) => new Date(h.createdAt).getTime() >= cutoff);
    }
    return items;
  }, [history, titleFilter, dateFilter]);

  if (authLoading) {
    return (
      <div className="flex items-center gap-2 text-slate-600">
        <Loader2 className="h-4 w-4 animate-spin" /> Loading…
      </div>
    );
  }

  if (!orgId) {
    return <p className="text-slate-600">Select an organization to use the RFP Analyzer.</p>;
  }

  // STATE 2 — analysis running
  if (analyzingId && !analyzingError) {
    const steps = [
      { label: "Document received", done: true },
      { label: "Extracting text…", done: true },
      {
        label: "Identifying requirements…",
        done: analyzingStatus === "Completed" || analyzingStatus === 2,
      },
      {
        label: "Building compliance matrix…",
        done: analyzingStatus === "Completed" || analyzingStatus === 2,
      },
    ];

    return (
      <div className="mx-auto max-w-lg space-y-6 py-16 text-center">
        <Loader2 className="mx-auto h-8 w-8 animate-spin text-slate-900" />
        <h2 className="text-lg font-semibold text-slate-900">Analyzing your RFP…</h2>
        <div className="space-y-2 text-left">
          {steps.map((s, i) => (
            <div key={i} className="flex items-center gap-2 text-sm">
              {s.done ? (
                <Check className="h-4 w-4 text-emerald-600" />
              ) : (
                <Loader2 className="h-4 w-4 animate-spin text-slate-400" />
              )}
              <span className={s.done ? "text-slate-900" : "text-slate-500"}>{s.label}</span>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (analyzingError) {
    return (
      <div className="mx-auto max-w-lg space-y-4 py-16 text-center">
        <AlertTriangle className="mx-auto h-8 w-8 text-red-600" />
        <h2 className="text-lg font-semibold text-slate-900">Analysis failed</h2>
        <p className="text-sm text-slate-600">{analyzingError}</p>
        <div className="flex justify-center gap-2">
          <Button
            variant="outline"
            onClick={() => {
              setAnalyzingId(null);
              setAnalyzingError(null);
              setAnalyzingStatus(null);
            }}
          >
            Back
          </Button>
          <Button onClick={() => void handleAnalyze()}>Retry</Button>
        </div>
      </div>
    );
  }

  // STATE 1 — default
  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-lg font-semibold text-slate-900">RFP Analyzer</h2>
        <p className="text-sm text-slate-500">
          Upload an RFP and let AI extract requirements, deadlines, and evaluation criteria.
        </p>
      </div>

      <div className="rounded-xl border bg-white p-6">
        <div
          {...getRootProps()}
          className={`cursor-pointer rounded-lg border-2 border-dashed px-6 py-10 text-center transition ${
            isDragActive ? "border-slate-900 bg-slate-50" : "border-slate-300"
          }`}
        >
          <input {...getInputProps()} />
          <Upload className="mx-auto mb-2 h-6 w-6 text-slate-400" />
          {file ? (
            <p className="text-sm text-slate-700">{file.name}</p>
          ) : (
            <p className="text-sm text-slate-500">
              Drag and drop an RFP (PDF/DOCX/DOC), or click to browse
            </p>
          )}
        </div>

        <div className="mt-4 flex items-center gap-3 text-sm text-slate-400">
          <div className="h-px flex-1 bg-slate-200" />
          or
          <div className="h-px flex-1 bg-slate-200" />
        </div>

        <div className="mt-4">
          <Label className="mb-1.5 block">Select from uploaded RFP documents</Label>
          <Select
            value={selectedDocId}
            onValueChange={(v) => {
              setSelectedDocId(v);
              setFile(null);
            }}
            disabled={readyRfps.length === 0}
          >
            <SelectTrigger>
              <SelectValue
                placeholder={
                  readyRfps.length === 0 ? "No ready RFP documents yet" : "Choose a document…"
                }
              />
            </SelectTrigger>
            <SelectContent>
              {readyRfps.map((d) => (
                <SelectItem key={d.id} value={d.id}>
                  {d.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="mt-4">
          <Label htmlFor="analysis-title" className="mb-1.5 block">
            Title (optional)
          </Label>
          <Input
            id="analysis-title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. City of Springfield — IT Services RFP"
          />
        </div>

        <Button
          className="mt-5 w-full"
          disabled={(!file && !selectedDocId) || uploading}
          onClick={() => void handleAnalyze()}
        >
          {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
          Analyze RFP
        </Button>
      </div>

      <div>
        <div className="mb-2 flex items-center justify-between gap-3">
          <h3 className="font-medium text-slate-900">Past Analyses</h3>
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
              <Input
                value={titleFilter}
                onChange={(e) => setTitleFilter(e.target.value)}
                placeholder="Search by title"
                className="h-8 w-48 pl-8 text-sm"
              />
            </div>
            <Select value={dateFilter} onValueChange={(v) => setDateFilter(v as DateFilter)}>
              <SelectTrigger className="h-8 w-36 text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="week">This Week</SelectItem>
                <SelectItem value="month">This Month</SelectItem>
                <SelectItem value="all">All Time</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {historyLoading ? (
          <div className="rounded-xl border bg-white">
            {[0, 1, 2, 3, 4].map((i) => (
              <DocumentRowSkeleton key={i} />
            ))}
          </div>
        ) : historyError ? (
          <ErrorState message="Could not load past analyses." onRetry={() => void fetchHistory()} />
        ) : history.length === 0 ? (
          <EmptyState
            icon={Search}
            title="No analyses yet"
            description="Analyze your first RFP using the upload above."
          />
        ) : filteredHistory.length === 0 ? (
          <EmptyState icon={Search} title="No results found" description="Try different keywords." />
        ) : (
          <div className="rounded-xl border bg-white">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Title</TableHead>
                  <TableHead>Document</TableHead>
                  <TableHead>Requirements</TableHead>
                  <TableHead>Compliance</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Analyzed</TableHead>
                  <TableHead className="w-[80px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredHistory.map((a) => (
                  <TableRow key={a.id}>
                    <TableCell className="font-medium">
                      <Link
                        href={`/dashboard/rfp-analyzer/${a.id}`}
                        className="hover:underline"
                      >
                        {a.title}
                      </Link>
                    </TableCell>
                    <TableCell className="text-slate-500">{a.documentName}</TableCell>
                    <TableCell className="text-slate-500">
                      {a.mandatoryRequirementCount} mandatory + {a.optionalRequirementCount} optional
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <div className="h-1.5 w-16 overflow-hidden rounded bg-slate-100">
                          <div
                            className="h-full bg-slate-900"
                            style={{ width: `${a.compliancePercent}%` }}
                          />
                        </div>
                        <span className="text-xs text-slate-500">{a.compliancePercent}%</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{statusLabel(a.status)}</Badge>
                    </TableCell>
                    <TableCell className="text-slate-500">{formatRelative(a.createdAt)}</TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-red-600 hover:text-red-700"
                        onClick={() => void handleDeleteAnalysis(a)}
                        aria-label="Delete analysis"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>
    </div>
  );
}

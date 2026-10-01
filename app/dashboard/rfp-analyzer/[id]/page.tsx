"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import {
  AlertCircle,
  Calendar,
  ChevronDown,
  ChevronUp,
  Download,
  FileText,
  Loader2,
  MessageSquare,
  Scale,
  Send,
} from "lucide-react";
import { toast } from "sonner";
import api from "@/lib/api";
import { useAuth } from "@/components/providers/auth-provider";
import type { ApiResponse, ComplianceMatrixRow, RfpAnalysis } from "@/lib/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

type MatrixTab = "all" | "mandatory" | "optional";
type StatusFilter = "all" | "NotReviewed" | "Compliant" | "Partial" | "NonCompliant";

function complianceLabel(status: ComplianceMatrixRow["complianceStatus"]): string {
  if (typeof status === "number") {
    return ["NotReviewed", "Compliant", "Partial", "NonCompliant"][status] ?? String(status);
  }
  return String(status);
}

function statusBadgeClass(label: string): string {
  switch (label) {
    case "Compliant":
      return "border-emerald-200 bg-emerald-50 text-emerald-800";
    case "Partial":
      return "border-amber-200 bg-amber-50 text-amber-800";
    case "NonCompliant":
      return "border-red-200 bg-red-50 text-red-800";
    default:
      return "border-slate-200 bg-slate-50 text-slate-700";
  }
}

function deadlineColor(dateStr?: string | null): string {
  if (!dateStr) return "text-slate-600";
  const days = (new Date(dateStr).getTime() - Date.now()) / 86_400_000;
  if (days < 0) return "text-slate-400 line-through";
  if (days < 7) return "text-red-600 font-medium";
  if (days < 30) return "text-amber-600 font-medium";
  return "text-emerald-700";
}

interface ChatTurn {
  role: "user" | "assistant";
  content: string;
  sources?: { documentName: string; chunkContent: string }[];
}

const SUGGESTED_QUESTIONS = [
  "What are the submission requirements?",
  "What are the payment terms?",
  "Who is the point of contact?",
];

export default function RfpAnalysisResultsPage() {
  const params = useParams<{ id: string }>();
  const analysisId = params.id;
  const { currentOrg, loading: authLoading } = useAuth();
  const orgId = currentOrg?.id;

  const [analysis, setAnalysis] = useState<RfpAnalysis | null>(null);
  const [loading, setLoading] = useState(true);
  const [matrix, setMatrix] = useState<ComplianceMatrixRow[]>([]);
  const [saveState, setSaveState] = useState<"idle" | "pending" | "saving" | "saved" | "error">("idle");
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [matrixTab, setMatrixTab] = useState<MatrixTab>("all");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [matrixSearch, setMatrixSearch] = useState("");

  const [chatOpen, setChatOpen] = useState(false);
  const [chatTurns, setChatTurns] = useState<ChatTurn[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [chatLoading, setChatLoading] = useState(false);

  const fetchAnalysis = useCallback(async () => {
    if (!orgId || !analysisId) return;
    try {
      const res = await api.get<ApiResponse<RfpAnalysis>>(
        `/api/organizations/${orgId}/rfp-analyses/${analysisId}`
      );
      if (res.data.success && res.data.data) {
        setAnalysis(res.data.data);
        setMatrix(res.data.data.complianceMatrix);
      } else {
        toast.error(res.data.message || "Analysis not found");
      }
    } catch {
      // Error toast is shown by the global Axios interceptor (lib/api.ts).
    } finally {
      setLoading(false);
    }
  }, [orgId, analysisId]);

  useEffect(() => {
    if (!authLoading && orgId) void fetchAnalysis();
  }, [authLoading, orgId, fetchAnalysis]);

  const saveMatrix = useCallback(
    (next: ComplianceMatrixRow[]) => {
      if (!orgId || !analysisId) return;
      setSaveState("pending");
      if (saveTimer.current) clearTimeout(saveTimer.current);
      saveTimer.current = setTimeout(async () => {
        setSaveState("saving");
        try {
          await api.patch(`/api/organizations/${orgId}/rfp-analyses/${analysisId}/matrix`, {
            matrix: next,
          });
          setSaveState("saved");
          setTimeout(() => setSaveState((s) => (s === "saved" ? "idle" : s)), 3000);
        } catch {
          setSaveState("error");
        }
      }, 1500);
    },
    [orgId, analysisId]
  );

  function updateRow(reqId: string, patch: Partial<ComplianceMatrixRow>) {
    setMatrix((prev) => {
      const next = prev.map((r) => (r.reqId === reqId ? { ...r, ...patch } : r));
      saveMatrix(next);
      return next;
    });
  }

  const filteredMatrix = useMemo(() => {
    let rows = matrix;
    if (matrixTab === "mandatory") rows = rows.filter((r) => r.isMandatory);
    if (matrixTab === "optional") rows = rows.filter((r) => !r.isMandatory);
    if (statusFilter !== "all") {
      rows = rows.filter((r) => complianceLabel(r.complianceStatus) === statusFilter);
    }
    if (matrixSearch.trim()) {
      const q = matrixSearch.trim().toLowerCase();
      rows = rows.filter(
        (r) => r.description.toLowerCase().includes(q) || r.reqId.toLowerCase().includes(q)
      );
    }
    return rows;
  }, [matrix, matrixTab, statusFilter, matrixSearch]);

  const counts = useMemo(() => {
    const c = { Compliant: 0, Partial: 0, NonCompliant: 0, NotReviewed: 0 };
    for (const r of matrix) {
      const label = complianceLabel(r.complianceStatus) as keyof typeof c;
      if (label in c) c[label]++;
    }
    return c;
  }, [matrix]);

  const overallCompliance = useMemo(() => {
    const mandatory = matrix.filter((r) => r.isMandatory);
    if (mandatory.length === 0) return 0;
    const compliant = mandatory.filter((r) => complianceLabel(r.complianceStatus) === "Compliant").length;
    return Math.round((compliant / mandatory.length) * 100);
  }, [matrix]);

  const nearestDeadline = useMemo(() => {
    const withDates = (analysis?.deadlines ?? [])
      .filter((d) => d.date)
      .sort((a, b) => new Date(a.date!).getTime() - new Date(b.date!).getTime());
    return withDates.find((d) => new Date(d.date!).getTime() >= Date.now()) ?? withDates[0];
  }, [analysis]);

  async function handleExport() {
    if (!orgId || !analysisId) return;
    try {
      const res = await api.get(`/api/organizations/${orgId}/rfp-analyses/${analysisId}/export`, {
        params: { format: "xlsx" },
        responseType: "blob",
      });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const a = document.createElement("a");
      a.href = url;
      a.download = `compliance-matrix-${analysisId}.xlsx`;
      a.click();
      window.URL.revokeObjectURL(url);
    } catch {
      // Error toast is shown by the global Axios interceptor (lib/api.ts).
    }
  }

  async function sendChat(question: string) {
    if (!orgId || !analysisId || !question.trim()) return;
    setChatTurns((prev) => [...prev, { role: "user", content: question }]);
    setChatInput("");
    setChatLoading(true);
    try {
      const history = chatTurns.map((t) => ({ role: t.role, content: t.content }));
      const res = await api.post<
        ApiResponse<{ answer: string; sources: { documentName: string; chunkContent: string }[] }>
      >(`/api/organizations/${orgId}/rfp-analyses/${analysisId}/chat`, {
        question,
        conversationHistory: history,
      });
      if (res.data.success && res.data.data) {
        setChatTurns((prev) => [
          ...prev,
          { role: "assistant", content: res.data.data!.answer, sources: res.data.data!.sources },
        ]);
      } else {
        toast.error(res.data.message || "Chat failed");
      }
    } catch {
      // Error toast is shown by the global Axios interceptor (lib/api.ts).
    } finally {
      setChatLoading(false);
    }
  }

  if (authLoading || loading) {
    return (
      <div className="flex items-center gap-2 text-slate-600">
        <Loader2 className="h-4 w-4 animate-spin" /> Loading…
      </div>
    );
  }

  if (!analysis) {
    return <p className="text-slate-600">Analysis not found.</p>;
  }

  return (
    <div className="space-y-6 pb-24">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm text-slate-500">
            <Link href="/dashboard/rfp-analyzer" className="hover:underline">
              RFP Analyzer
            </Link>{" "}
            / <span className="text-slate-700">{analysis.title}</span>
          </p>
          <h2 className="text-lg font-semibold text-slate-900">{analysis.title}</h2>
        </div>
        <Button
          onClick={() =>
            toast.info("Proposal generation is coming in Phase 5 and will link back to this analysis.")
          }
        >
          Generate Proposal
        </Button>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <div className="rounded-xl border bg-white p-4">
          <p className="text-xs font-medium text-blue-700">Total Requirements</p>
          <p className="mt-1 text-2xl font-semibold text-slate-900">{analysis.requirements.length}</p>
        </div>
        <div className="rounded-xl border bg-white p-4">
          <p className="text-xs font-medium text-red-700">Mandatory Requirements</p>
          <p className="mt-1 text-2xl font-semibold text-slate-900">
            {analysis.requirements.filter((r) => r.isMandatory).length}
          </p>
        </div>
        <div className="rounded-xl border bg-white p-4">
          <p className="text-xs font-medium text-orange-700">Nearest Deadline</p>
          <p className="mt-1 text-lg font-semibold text-slate-900">
            {nearestDeadline?.date ?? "—"}
          </p>
          {nearestDeadline?.name ? (
            <p className="truncate text-xs text-slate-500">{nearestDeadline.name}</p>
          ) : null}
        </div>
        <div className="rounded-xl border bg-white p-4">
          <p className="text-xs font-medium text-purple-700">Evaluation Criteria</p>
          <p className="mt-1 text-2xl font-semibold text-slate-900">
            {analysis.evaluationCriteria.length}
          </p>
        </div>
      </div>

      {/* 3 columns */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="rounded-xl border bg-white p-4">
          <div className="mb-2 flex items-center gap-2 font-medium text-slate-900">
            <FileText className="h-4 w-4" /> AI Summary
          </div>
          <p className="text-sm text-slate-600">{analysis.aiSummary || "No summary available."}</p>
          <dl className="mt-3 space-y-1 text-xs text-slate-500">
            {analysis.issuingOrganization ? (
              <div>
                <dt className="inline font-medium">Issuing Org: </dt>
                <dd className="inline">{analysis.issuingOrganization}</dd>
              </div>
            ) : null}
            {analysis.contractDuration ? (
              <div>
                <dt className="inline font-medium">Duration: </dt>
                <dd className="inline">{analysis.contractDuration}</dd>
              </div>
            ) : null}
            {analysis.budgetRange?.min || analysis.budgetRange?.max ? (
              <div>
                <dt className="inline font-medium">Budget: </dt>
                <dd className="inline">
                  {analysis.budgetRange.currency} {analysis.budgetRange.min ?? "?"}–
                  {analysis.budgetRange.max ?? "?"}
                </dd>
              </div>
            ) : null}
          </dl>
          {analysis.aiModelUsed ? (
            <p className="mt-2 text-xs text-slate-400">
              Analyzed {new Date(analysis.createdAt).toLocaleDateString()} · {analysis.aiModelUsed}
            </p>
          ) : null}
        </div>

        <div className="rounded-xl border bg-white p-4">
          <div className="mb-2 flex items-center gap-2 font-medium text-slate-900">
            <Calendar className="h-4 w-4" /> Key Deadlines
          </div>
          {analysis.deadlines.length === 0 ? (
            <p className="text-sm text-slate-500">No deadlines extracted.</p>
          ) : (
            <ul className="space-y-2 text-sm">
              {[...analysis.deadlines]
                .sort((a, b) => new Date(a.date ?? 0).getTime() - new Date(b.date ?? 0).getTime())
                .map((d, i) => (
                  <li key={i} className="border-b border-slate-100 pb-2 last:border-0">
                    <p className="font-medium text-slate-900">{d.name}</p>
                    <p className={deadlineColor(d.date)}>
                      {d.date} {d.time}
                    </p>
                    {d.notes ? <p className="text-xs text-slate-500">{d.notes}</p> : null}
                  </li>
                ))}
            </ul>
          )}
        </div>

        <div className="rounded-xl border bg-white p-4">
          <div className="mb-2 flex items-center gap-2 font-medium text-slate-900">
            <Scale className="h-4 w-4" /> Evaluation Criteria
          </div>
          {analysis.evaluationCriteria.length === 0 ? (
            <p className="text-sm text-slate-500">No evaluation criteria extracted.</p>
          ) : (
            <div className="space-y-2">
              {analysis.evaluationCriteria.map((c, i) => (
                <div key={i}>
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-700">{c.criterion}</span>
                    <span className="font-medium text-slate-900">{c.weightPercent}%</span>
                  </div>
                  <div className="mt-1 h-1.5 overflow-hidden rounded bg-slate-100">
                    <div
                      className="h-full bg-purple-600"
                      style={{ width: `${Math.min(100, c.weightPercent)}%` }}
                    />
                  </div>
                </div>
              ))}
              {(() => {
                const total = analysis.evaluationCriteria.reduce((s, c) => s + c.weightPercent, 0);
                return Math.round(total) !== 100 ? (
                  <p className="flex items-center gap-1 text-xs text-amber-600">
                    <AlertCircle className="h-3 w-3" /> Weights total {Math.round(total)}%, not 100%.
                  </p>
                ) : null;
              })()}
            </div>
          )}
        </div>
      </div>

      {/* Compliance Matrix */}
      <div className="rounded-xl border bg-white p-4">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <Tabs value={matrixTab} onValueChange={(v) => setMatrixTab(v as MatrixTab)}>
              <TabsList>
                <TabsTrigger value="all">All</TabsTrigger>
                <TabsTrigger value="mandatory">Mandatory</TabsTrigger>
                <TabsTrigger value="optional">Optional</TabsTrigger>
              </TabsList>
            </Tabs>
            <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as StatusFilter)}>
              <SelectTrigger className="h-9 w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All statuses</SelectItem>
                <SelectItem value="NotReviewed">Not Reviewed</SelectItem>
                <SelectItem value="Compliant">Compliant</SelectItem>
                <SelectItem value="Partial">Partial</SelectItem>
                <SelectItem value="NonCompliant">Non-Compliant</SelectItem>
              </SelectContent>
            </Select>
            <Input
              value={matrixSearch}
              onChange={(e) => setMatrixSearch(e.target.value)}
              placeholder="Search requirements…"
              className="h-9 w-48"
            />
          </div>
          <Button variant="outline" size="sm" onClick={() => void handleExport()}>
            <Download className="h-4 w-4" /> Export Excel
          </Button>
        </div>

        <div className="mb-3 flex flex-wrap items-center gap-3 text-sm">
          <span>✅ {counts.Compliant}</span>
          <span>⚠️ {counts.Partial}</span>
          <span>❌ {counts.NonCompliant}</span>
          <span>⬜ {counts.NotReviewed}</span>
          <span className="ml-auto text-xs text-slate-400">
            {saveState === "pending" || saveState === "saving"
              ? "Saving…"
              : saveState === "saved"
                ? "✓ All changes saved"
                : saveState === "error"
                  ? "⚠ Save failed"
                  : null}
          </span>
        </div>

        <div className="mb-3">
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span>Overall Compliance</span>
            <span>{overallCompliance}%</span>
          </div>
          <div className="mt-1 h-2 overflow-hidden rounded bg-slate-100">
            <div
              className={`h-full ${
                overallCompliance < 40
                  ? "bg-red-500"
                  : overallCompliance < 75
                    ? "bg-amber-500"
                    : "bg-emerald-500"
              }`}
              style={{ width: `${overallCompliance}%` }}
            />
          </div>
        </div>

        {filteredMatrix.length === 0 ? (
          <div className="rounded-lg border border-dashed border-slate-300 py-10 text-center text-sm text-slate-500">
            No requirements match this filter.
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-20">ID</TableHead>
                <TableHead>Requirement</TableHead>
                <TableHead className="w-24">Section</TableHead>
                <TableHead className="w-24">Type</TableHead>
                <TableHead className="w-36">Status</TableHead>
                <TableHead>Notes</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredMatrix.map((row) => (
                <TableRow key={row.reqId || row.description}>
                  <TableCell className="text-xs text-slate-500">{row.reqId}</TableCell>
                  <TableCell className="max-w-[320px] text-sm">{row.description}</TableCell>
                  <TableCell className="text-xs text-slate-500">{row.section}</TableCell>
                  <TableCell>
                    <Badge variant={row.isMandatory ? "destructive" : "secondary"}>
                      {row.isMandatory ? "MANDATORY" : "OPTIONAL"}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Select
                      value={complianceLabel(row.complianceStatus)}
                      onValueChange={(v) =>
                        updateRow(row.reqId, { complianceStatus: v as ComplianceMatrixRow["complianceStatus"] })
                      }
                    >
                      <SelectTrigger className={`h-8 text-xs ${statusBadgeClass(complianceLabel(row.complianceStatus))}`}>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="NotReviewed">Not Reviewed</SelectItem>
                        <SelectItem value="Compliant">Compliant</SelectItem>
                        <SelectItem value="Partial">Partial</SelectItem>
                        <SelectItem value="NonCompliant">Non-Compliant</SelectItem>
                      </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell>
                    <Input
                      value={row.notes ?? ""}
                      onChange={(e) => updateRow(row.reqId, { notes: e.target.value })}
                      placeholder="Click to add notes…"
                      className="h-8 text-xs"
                    />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>

      {/* RAG chat widget */}
      <div className="fixed inset-x-0 bottom-0 z-20 flex justify-end px-6 pb-4">
        <div className="w-full max-w-md rounded-xl border bg-white shadow-lg">
          <button
            onClick={() => setChatOpen((v) => !v)}
            className="flex w-full items-center justify-between rounded-t-xl bg-slate-900 px-4 py-2 text-sm font-medium text-white"
          >
            <span className="flex items-center gap-2">
              <MessageSquare className="h-4 w-4" /> Ask about this RFP
            </span>
            {chatOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronUp className="h-4 w-4" />}
          </button>
          {chatOpen ? (
            <div className="flex max-h-96 flex-col">
              <div className="flex-1 space-y-3 overflow-y-auto p-3">
                {chatTurns.length === 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {SUGGESTED_QUESTIONS.map((q) => (
                      <button
                        key={q}
                        onClick={() => void sendChat(q)}
                        className="rounded-full border border-slate-200 px-3 py-1 text-xs text-slate-600 hover:bg-slate-50"
                      >
                        {q}
                      </button>
                    ))}
                  </div>
                ) : (
                  chatTurns.map((t, i) => (
                    <div key={i} className={`flex ${t.role === "user" ? "justify-end" : "justify-start"}`}>
                      <div
                        className={`max-w-[85%] rounded-lg px-3 py-2 text-sm ${
                          t.role === "user" ? "bg-blue-600 text-white" : "bg-slate-100 text-slate-800"
                        }`}
                      >
                        <p className="whitespace-pre-wrap">{t.content}</p>
                        {t.sources && t.sources.length > 0 ? (
                          <p className="mt-1 text-xs opacity-70">
                            Sources: {t.sources.map((s) => s.documentName).join(", ")}
                          </p>
                        ) : null}
                      </div>
                    </div>
                  ))
                )}
                {chatLoading ? (
                  <div className="flex items-center gap-2 text-xs text-slate-400">
                    <Loader2 className="h-3 w-3 animate-spin" /> Thinking…
                  </div>
                ) : null}
              </div>
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  void sendChat(chatInput);
                }}
                className="flex items-center gap-2 border-t p-2"
              >
                <Input
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  placeholder="Ask a question…"
                  className="h-9"
                />
                <Button type="submit" size="icon" disabled={chatLoading || !chatInput.trim()}>
                  <Send className="h-4 w-4" />
                </Button>
              </form>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

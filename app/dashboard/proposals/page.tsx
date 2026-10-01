"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { FileText, Loader2, MoreHorizontal, Plus } from "lucide-react";
import { toast } from "sonner";
import { useConfirm } from "@/components/confirm-provider";
import { EmptyState } from "@/components/empty-state";
import { ErrorState } from "@/components/error-state";
import { ProposalCardSkeleton } from "@/components/skeletons";
import api from "@/lib/api";
import { NEW_PROPOSAL_EVENT } from "@/lib/new-proposal-event";
import { useAuth } from "@/components/providers/auth-provider";
import type {
  ApiResponse,
  DocumentListResponse,
  Proposal,
  ProposalListResponse,
  RfpAnalysisListResponse,
  RfpAnalysisSummary,
} from "@/lib/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

function statusLabel(status: Proposal["status"]): string {
  if (typeof status === "number") {
    return ["Draft", "InReview", "Approved", "Submitted", "Archived"][status] ?? String(status);
  }
  return String(status);
}

function statusBadgeClass(label: string): string {
  switch (label) {
    case "Draft":
      return "border-slate-200 bg-slate-50 text-slate-700";
    case "InReview":
      return "border-amber-200 bg-amber-50 text-amber-800";
    case "Approved":
      return "border-emerald-200 bg-emerald-50 text-emerald-800";
    case "Submitted":
      return "border-blue-200 bg-blue-50 text-blue-800";
    default:
      return "border-slate-200 bg-slate-100 text-slate-500";
  }
}

function formatRelative(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const hours = Math.floor(diff / 3_600_000);
  if (hours < 1) return "just now";
  if (hours < 24) return `${hours} hour${hours === 1 ? "" : "s"} ago`;
  const days = Math.floor(hours / 24);
  return `${days} day${days === 1 ? "" : "s"} ago`;
}

export default function ProposalsPage() {
  const { currentOrg, loading: authLoading } = useAuth();
  const confirm = useConfirm();
  const orgId = currentOrg?.id;
  const router = useRouter();

  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);

  const [createOpen, setCreateOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [linkedAnalysisId, setLinkedAnalysisId] = useState<string>("");
  const [templateId, setTemplateId] = useState<string>("");
  const [analyses, setAnalyses] = useState<RfpAnalysisSummary[]>([]);
  const [templates, setTemplates] = useState<{ id: string; name: string }[]>([]);
  const [creating, setCreating] = useState(false);

  const fetchProposals = useCallback(async () => {
    if (!orgId) return;
    setLoadError(false);
    try {
      const res = await api.get<ApiResponse<ProposalListResponse>>(
        `/api/organizations/${orgId}/proposals`,
        { params: { page: 1, pageSize: 50 } }
      );
      if (res.data.success && res.data.data) {
        setProposals(res.data.data.items);
      }
    } catch {
      // Error toast is shown by the global Axios interceptor (lib/api.ts).
      setLoadError(true);
    } finally {
      setLoading(false);
    }
  }, [orgId]);

  useEffect(() => {
    if (!authLoading && orgId) void fetchProposals();
  }, [authLoading, orgId, fetchProposals]);

  // Command palette / Ctrl+N link here with ?new=1 to open the "New Proposal" modal.
  useEffect(() => {
    if (authLoading || !orgId) return;
    const params = new URLSearchParams(window.location.search);
    if (params.get("new") === "1") {
      void openCreateDialog();
      router.replace("/dashboard/proposals");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authLoading, orgId]);

  useEffect(() => {
    const onRequest = () => void openCreateDialog();
    window.addEventListener(NEW_PROPOSAL_EVENT, onRequest);
    return () => window.removeEventListener(NEW_PROPOSAL_EVENT, onRequest);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orgId]);

  async function openCreateDialog() {
    setCreateOpen(true);
    if (!orgId) return;
    try {
      const [analysisRes, docRes] = await Promise.all([
        api.get<ApiResponse<RfpAnalysisListResponse>>(`/api/organizations/${orgId}/rfp-analyses`, {
          params: { page: 1, pageSize: 50 },
        }),
        api.get<ApiResponse<DocumentListResponse>>(`/api/organizations/${orgId}/documents`, {
          params: { page: 1, pageSize: 100 },
        }),
      ]);
      if (analysisRes.data.success && analysisRes.data.data) {
        setAnalyses(analysisRes.data.data.items.filter((a) => a.status === "Completed" || a.status === 2));
      }
      if (docRes.data.success && docRes.data.data) {
        setTemplates(
          docRes.data.data.items
            .filter((d) => String(d.type).toLowerCase() === "template")
            .map((d) => ({ id: d.id, name: d.name }))
        );
      }
    } catch {
      // non-fatal — dropdowns just stay empty
    }
  }

  async function handleCreate() {
    if (!orgId || title.trim().length < 3) return;
    setCreating(true);
    try {
      const res = await api.post<ApiResponse<Proposal>>(`/api/organizations/${orgId}/proposals`, {
        title: title.trim(),
        rfpAnalysisId: linkedAnalysisId || undefined,
        templateDocumentId: templateId || undefined,
      });
      if (res.data.success && res.data.data) {
        router.push(`/dashboard/proposals/${res.data.data.id}/edit`);
      } else {
        toast.error(res.data.message || "Could not create proposal");
      }
    } catch {
      // Error toast is shown by the global Axios interceptor (lib/api.ts).
    } finally {
      setCreating(false);
    }
  }

  async function handleArchive(p: Proposal) {
    if (!orgId) return;
    try {
      await api.patch(`/api/organizations/${orgId}/proposals/${p.id}`, { status: "Archived" });
      toast.success("Proposal archived");
      await fetchProposals();
    } catch {
      // Error toast is shown by the global Axios interceptor (lib/api.ts).
    }
  }

  async function handleDelete(p: Proposal) {
    if (!orgId) return;
    if (!(await confirm({ description: `Delete "${p.title}"? This cannot be undone.` }))) return;
    try {
      await api.delete(`/api/organizations/${orgId}/proposals/${p.id}`);
      toast.success("Proposal deleted");
      await fetchProposals();
    } catch {
      // Error toast is shown by the global Axios interceptor (lib/api.ts).
    }
  }

  if (authLoading || loading) {
    return (
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <ProposalCardSkeleton key={i} />
        ))}
      </div>
    );
  }

  if (!orgId) {
    return <p className="text-slate-600">Select an organization to manage proposals.</p>;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">Proposals</h2>
          <p className="text-sm text-slate-500">Draft, generate, and export proposals with AI.</p>
        </div>
        <Button onClick={() => void openCreateDialog()}>
          <Plus className="h-4 w-4" /> New Proposal
        </Button>
      </div>

      {loadError ? (
        <ErrorState message="Could not load proposals." onRetry={() => void fetchProposals()} />
      ) : proposals.length === 0 ? (
        <EmptyState
          icon={FileText}
          title="No proposals yet"
          description="Draft, generate, and export proposals with AI."
          action={{ label: "Create your first proposal", onClick: () => void openCreateDialog() }}
        />
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {proposals.map((p) => {
            const label = statusLabel(p.status);
            return (
              <Card key={p.id} className="flex flex-col gap-2 p-4">
                <div className="flex items-start justify-between gap-2">
                  <h3 className="line-clamp-2 font-semibold text-slate-900">{p.title}</h3>
                  <Badge variant="outline" className={statusBadgeClass(label)}>
                    {label}
                  </Badge>
                </div>
                {p.rfpAnalysisTitle ? (
                  <p className="truncate text-xs text-slate-500">RFP: {p.rfpAnalysisTitle}</p>
                ) : null}
                <p className="text-xs text-slate-400">Last edited {formatRelative(p.updatedAt)}</p>
                {p.totalWordCount > 0 ? (
                  <p className="text-xs text-slate-400">{p.totalWordCount.toLocaleString()} words</p>
                ) : null}
                <div className="mt-2 flex items-center gap-2">
                  <Button size="sm" className="flex-1" asChild>
                    <Link href={`/dashboard/proposals/${p.id}/edit`}>Edit</Link>
                  </Button>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => void handleArchive(p)}>Archive</DropdownMenuItem>
                      <DropdownMenuItem className="text-red-600" onClick={() => void handleDelete(p)}>
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>New Proposal</DialogTitle>
            <DialogDescription>Optionally link an RFP analysis or start from a template.</DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label htmlFor="proposal-title" className="mb-1.5 block">
                Title
              </Label>
              <Input
                id="proposal-title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                maxLength={200}
                placeholder="e.g. Acme Corp — Q4 RFP Response"
              />
            </div>
            <div>
              <Label className="mb-1.5 block">Link to RFP Analysis (optional)</Label>
              <Select value={linkedAnalysisId} onValueChange={setLinkedAnalysisId}>
                <SelectTrigger>
                  <SelectValue placeholder="None" />
                </SelectTrigger>
                <SelectContent>
                  {analyses.map((a) => (
                    <SelectItem key={a.id} value={a.id}>
                      {a.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="mb-1.5 block">Start from template (optional)</Label>
              <Select value={templateId} onValueChange={setTemplateId}>
                <SelectTrigger>
                  <SelectValue placeholder="None" />
                </SelectTrigger>
                <SelectContent>
                  {templates.map((t) => (
                    <SelectItem key={t.id} value={t.id}>
                      {t.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>
              Cancel
            </Button>
            <Button disabled={title.trim().length < 3 || creating} onClick={() => void handleCreate()}>
              {creating ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              Create
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
  arrayMove,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  ArrowLeft,
  Download,
  GripVertical,
  Loader2,
  MessageSquare,
  Plus,
  Scale,
  Share2,
  Sparkles,
  Trash2,
  Wand2,
  X,
  History,
} from "lucide-react";
import { toast } from "sonner";
import type { JSONContent } from "@tiptap/react";
import { useConfirm } from "@/components/confirm-provider";
import api from "@/lib/api";
import { useAuth } from "@/components/providers/auth-provider";
import { useAutoSave } from "@/hooks/useAutoSave";
import { RichTextEditor } from "@/components/editor/RichTextEditor";
import type {
  ApiResponse,
  Comment,
  ComplianceCheckResult,
  Proposal,
  ProposalSection,
  ProposalShare,
  ProposalStatus,
  ProposalVersionDetail,
  ProposalVersionSummary,
} from "@/lib/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { IconTooltip } from "@/components/ui/tooltip";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";

function statusLabel(status: ProposalStatus): string {
  if (typeof status === "number") {
    return ["Draft", "InReview", "Approved", "Submitted", "Archived"][status] ?? String(status);
  }
  return String(status);
}

const SECTION_CHIPS = ["Executive Summary", "Technical Approach", "Pricing", "Timeline", "Team"];

function SortableSectionItem({
  section,
  active,
  onSelect,
  onDelete,
}: {
  section: ProposalSection;
  active: boolean;
  onSelect: () => void;
  onDelete: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: section.id });
  const style = { transform: CSS.Transform.toString(transform), transition };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`group flex items-center gap-1 rounded px-2 py-1.5 text-sm ${
        active ? "border-l-2 border-blue-600 bg-blue-50 text-blue-900" : "text-slate-700 hover:bg-slate-50"
      }`}
    >
      <button type="button" {...attributes} {...listeners} className="cursor-grab text-slate-400">
        <GripVertical className="h-3.5 w-3.5" />
      </button>
      <button type="button" onClick={onSelect} className="flex-1 truncate text-left">
        {section.title}
      </button>
      <button
        type="button"
        onClick={onDelete}
        className="hidden text-slate-400 hover:text-red-600 group-hover:block"
        aria-label="Delete section"
      >
        <Trash2 className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}

export default function ProposalEditorPage() {
  const params = useParams<{ id: string }>();
  const proposalId = params.id;
  const { currentOrg, loading: authLoading } = useAuth();
  const confirm = useConfirm();
  const orgId = currentOrg?.id;

  const [proposal, setProposal] = useState<Proposal | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeSectionId, setActiveSectionId] = useState<string | null>(null);
  const [rightPanelOpen, setRightPanelOpen] = useState(true);
  const [rightPanelTab, setRightPanelTab] = useState<"generate" | "compliance">("generate");

  const [tone, setTone] = useState("formal");
  const [useRfpContext, setUseRfpContext] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [generatedPreview, setGeneratedPreview] = useState<string | null>(null);

  const [complianceResult, setComplianceResult] = useState<ComplianceCheckResult | null>(null);
  const [complianceLoading, setComplianceLoading] = useState(false);

  const [commentsOpen, setCommentsOpen] = useState(false);
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState("");
  const [replyDrafts, setReplyDrafts] = useState<Record<string, string>>({});

  const [versionsOpen, setVersionsOpen] = useState(false);
  const [versions, setVersions] = useState<ProposalVersionSummary[]>([]);
  const [previewVersion, setPreviewVersion] = useState<ProposalVersionDetail | null>(null);

  const [shareOpen, setShareOpen] = useState(false);
  const [shares, setShares] = useState<ProposalShare[]>([]);
  const [shareEmail, setShareEmail] = useState("");

  const [generateFullOpen, setGenerateFullOpen] = useState(false);
  const [generateFullTone, setGenerateFullTone] = useState("formal");
  const [generatingFull, setGeneratingFull] = useState(false);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  const fetchProposal = useCallback(async () => {
    if (!orgId || !proposalId) return;
    try {
      const res = await api.get<ApiResponse<Proposal>>(`/api/organizations/${orgId}/proposals/${proposalId}`);
      if (res.data.success && res.data.data) {
        setProposal(res.data.data);
        const sections = res.data.data.sections;
        if (sections.length > 0 && !activeSectionId) {
          setActiveSectionId(sections[0].id);
        }
      } else {
        toast.error(res.data.message || "Proposal not found");
      }
    } catch {
      // Error toast is shown by the global Axios interceptor (lib/api.ts).
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orgId, proposalId]);

  useEffect(() => {
    if (!authLoading && orgId) void fetchProposal();
  }, [authLoading, orgId, fetchProposal]);

  const sections = useMemo(
    () => (proposal?.sections ?? []).slice().sort((a, b) => a.orderIndex - b.orderIndex),
    [proposal]
  );
  const activeSection = sections.find((s) => s.id === activeSectionId) ?? null;

  const saveSection = useCallback(
    async (payload: { sectionId: string; content: string; wordCount: number }) => {
      if (!orgId || !proposalId) return;
      await api.patch(
        `/api/organizations/${orgId}/proposals/${proposalId}/sections/${payload.sectionId}`,
        { content: payload.content, wordCount: payload.wordCount }
      );
    },
    [orgId, proposalId]
  );

  const autoSave = useAutoSave<{ sectionId: string; content: string; wordCount: number }>(saveSection);

  function handleEditorChange(json: JSONContent, wordCount: number) {
    if (!activeSection) return;
    const content = JSON.stringify(json);
    setProposal((prev) =>
      prev
        ? {
            ...prev,
            sections: prev.sections.map((s) =>
              s.id === activeSection.id ? { ...s, content, wordCount } : s
            ),
          }
        : prev
    );
    autoSave.trigger({ sectionId: activeSection.id, content, wordCount });
  }

  function selectSection(id: string) {
    autoSave.flush();
    setActiveSectionId(id);
    setGeneratedPreview(null);
  }

  async function handleAddSection(title?: string) {
    if (!orgId || !proposalId) return;
    try {
      const res = await api.post<ApiResponse<ProposalSection>>(
        `/api/organizations/${orgId}/proposals/${proposalId}/sections`,
        { title: title || "New Section", orderIndex: sections.length }
      );
      if (res.data.success && res.data.data) {
        setProposal((prev) => (prev ? { ...prev, sections: [...prev.sections, res.data.data!] } : prev));
        setActiveSectionId(res.data.data.id);
      }
    } catch {
      // Error toast is shown by the global Axios interceptor (lib/api.ts).
    }
  }

  async function handleDeleteSection(id: string) {
    if (!orgId || !proposalId) return;
    if (!(await confirm({ description: "Delete this section? Content will be lost." }))) return;
    try {
      await api.delete(`/api/organizations/${orgId}/proposals/${proposalId}/sections/${id}`);
      setProposal((prev) => {
        if (!prev) return prev;
        const remaining = prev.sections.filter((s) => s.id !== id);
        if (activeSectionId === id) {
          setActiveSectionId(remaining[0]?.id ?? null);
        }
        return { ...prev, sections: remaining };
      });
    } catch {
      // Error toast is shown by the global Axios interceptor (lib/api.ts).
    }
  }

  async function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id || !orgId || !proposalId) return;

    const oldIndex = sections.findIndex((s) => s.id === active.id);
    const newIndex = sections.findIndex((s) => s.id === over.id);
    const reordered = arrayMove(sections, oldIndex, newIndex).map((s, i) => ({ ...s, orderIndex: i }));

    setProposal((prev) => (prev ? { ...prev, sections: reordered } : prev));

    try {
      await api.post(`/api/organizations/${orgId}/proposals/${proposalId}/sections/reorder`, {
        orderedIds: reordered.map((s) => s.id),
      });
    } catch {
      // Error toast is shown by the global Axios interceptor (lib/api.ts).
      await fetchProposal();
    }
  }

  async function handleTitleBlur(newTitle: string) {
    if (!orgId || !proposalId || !proposal || newTitle.trim() === proposal.title) return;
    try {
      await api.patch(`/api/organizations/${orgId}/proposals/${proposalId}`, { title: newTitle.trim() });
    } catch {
      // Error toast is shown by the global Axios interceptor (lib/api.ts).
    }
  }

  async function handleStatusChange(status: string) {
    if (!orgId || !proposalId) return;
    try {
      const res = await api.patch<ApiResponse<Proposal>>(
        `/api/organizations/${orgId}/proposals/${proposalId}`,
        { status }
      );
      if (res.data.data) setProposal(res.data.data);
    } catch {
      // Error toast is shown by the global Axios interceptor (lib/api.ts).
    }
  }

  async function handleGenerate() {
    if (!orgId || !proposalId || !activeSection) return;
    setGenerating(true);
    setGeneratedPreview(null);
    try {
      const res = await api.post<ApiResponse<{ content: string }>>(
        `/api/organizations/${orgId}/proposals/${proposalId}/sections/${activeSection.id}/generate`,
        { tone, useRfpContext }
      );
      if (res.data.success && res.data.data) {
        setGeneratedPreview(res.data.data.content);
      } else {
        toast.error(res.data.message || "Generation failed");
      }
    } catch {
      // Error toast is shown by the global Axios interceptor (lib/api.ts).
    } finally {
      setGenerating(false);
    }
  }

  function insertGenerated() {
    if (!generatedPreview || !activeSection) return;
    const doc: JSONContent = {
      type: "doc",
      content: generatedPreview
        .split(/\n+/)
        .filter((p) => p.trim())
        .map((paragraph) => ({ type: "paragraph", content: [{ type: "text", text: paragraph.trim() }] })),
    };
    const content = JSON.stringify(doc);
    const wordCount = generatedPreview.trim().split(/\s+/).length;
    setProposal((prev) =>
      prev
        ? { ...prev, sections: prev.sections.map((s) => (s.id === activeSection.id ? { ...s, content, wordCount } : s)) }
        : prev
    );
    autoSave.trigger({ sectionId: activeSection.id, content, wordCount });
    setGeneratedPreview(null);
    toast.success(`Generated ${wordCount} words`);
  }

  async function handleGenerateFull() {
    if (!orgId || !proposalId) return;
    setGeneratingFull(true);
    try {
      const res = await api.post<ApiResponse<Proposal>>(
        `/api/organizations/${orgId}/proposals/${proposalId}/generate-full`,
        { tone: generateFullTone, useRfpContext: true }
      );
      if (res.data.success && res.data.data) {
        setProposal(res.data.data);
        setActiveSectionId((prev) => prev ?? res.data.data!.sections[0]?.id ?? null);
        toast.success("Full proposal generated");
        setGenerateFullOpen(false);
      } else {
        toast.error(res.data.message || "Generation failed");
      }
    } catch {
      // Error toast is shown by the global Axios interceptor (lib/api.ts).
    } finally {
      setGeneratingFull(false);
    }
  }

  async function handleCheckCompliance() {
    if (!orgId || !proposalId) return;
    setComplianceLoading(true);
    try {
      const res = await api.post<ApiResponse<ComplianceCheckResult>>(
        `/api/organizations/${orgId}/proposals/${proposalId}/check-compliance`
      );
      if (res.data.success && res.data.data) {
        setComplianceResult(res.data.data);
      } else {
        toast.error(res.data.message || "Compliance check failed");
      }
    } catch {
      // Error toast is shown by the global Axios interceptor (lib/api.ts).
    } finally {
      setComplianceLoading(false);
    }
  }

  const fetchComments = useCallback(async () => {
    if (!orgId || !proposalId) return;
    try {
      const res = await api.get<ApiResponse<Comment[]>>(
        `/api/organizations/${orgId}/proposals/${proposalId}/comments`
      );
      if (res.data.success && res.data.data) setComments(res.data.data);
    } catch {
      // Error toast is shown by the global Axios interceptor (lib/api.ts).
    }
  }, [orgId, proposalId]);

  async function handleAddComment() {
    if (!orgId || !proposalId || !activeSection || !newComment.trim()) return;
    try {
      await api.post(`/api/organizations/${orgId}/proposals/${proposalId}/comments`, {
        sectionId: activeSection.id,
        anchorText: "",
        commentText: newComment.trim(),
      });
      setNewComment("");
      await fetchComments();
    } catch {
      // Error toast is shown by the global Axios interceptor (lib/api.ts).
    }
  }

  async function handleReply(commentId: string) {
    if (!orgId || !proposalId) return;
    const text = replyDrafts[commentId];
    if (!text?.trim()) return;
    try {
      await api.post(`/api/organizations/${orgId}/proposals/${proposalId}/comments/${commentId}/replies`, {
        commentText: text.trim(),
      });
      setReplyDrafts((prev) => ({ ...prev, [commentId]: "" }));
      await fetchComments();
    } catch {
      // Error toast is shown by the global Axios interceptor (lib/api.ts).
    }
  }

  async function handleResolve(commentId: string) {
    if (!orgId || !proposalId) return;
    try {
      await api.patch(`/api/organizations/${orgId}/proposals/${proposalId}/comments/${commentId}/resolve`);
      await fetchComments();
    } catch {
      // Error toast is shown by the global Axios interceptor (lib/api.ts).
    }
  }

  const fetchVersions = useCallback(async () => {
    if (!orgId || !proposalId) return;
    try {
      const res = await api.get<ApiResponse<ProposalVersionSummary[]>>(
        `/api/organizations/${orgId}/proposals/${proposalId}/versions`
      );
      if (res.data.success && res.data.data) setVersions(res.data.data);
    } catch {
      // Error toast is shown by the global Axios interceptor (lib/api.ts).
    }
  }, [orgId, proposalId]);

  async function handleViewVersion(versionId: string) {
    if (!orgId || !proposalId) return;
    try {
      const res = await api.get<ApiResponse<ProposalVersionDetail>>(
        `/api/organizations/${orgId}/proposals/${proposalId}/versions/${versionId}`
      );
      if (res.data.success && res.data.data) setPreviewVersion(res.data.data);
    } catch {
      // Error toast is shown by the global Axios interceptor (lib/api.ts).
    }
  }

  async function handleRestoreVersion(versionId: string) {
    if (!orgId || !proposalId) return;
    if (!(await confirm({ description: "Restore this version? Current content will be overwritten." }))) return;
    try {
      await api.post(`/api/organizations/${orgId}/proposals/${proposalId}/versions/${versionId}/restore`);
      toast.success("Version restored");
      setPreviewVersion(null);
      setVersionsOpen(false);
      await fetchProposal();
    } catch {
      // Error toast is shown by the global Axios interceptor (lib/api.ts).
    }
  }

  const fetchShares = useCallback(async () => {
    if (!orgId || !proposalId) return;
    try {
      const res = await api.get<ApiResponse<ProposalShare[]>>(
        `/api/organizations/${orgId}/proposals/${proposalId}/shares`
      );
      if (res.data.success && res.data.data) setShares(res.data.data);
    } catch {
      // Error toast is shown by the global Axios interceptor (lib/api.ts).
    }
  }, [orgId, proposalId]);

  async function handleShare() {
    if (!orgId || !proposalId || !shareEmail.trim()) return;
    try {
      await api.post(`/api/organizations/${orgId}/proposals/${proposalId}/shares`, {
        email: shareEmail.trim(),
        permission: "View",
      });
      setShareEmail("");
      toast.success("Shared");
      await fetchShares();
    } catch {
      // Error toast is shown by the global Axios interceptor (lib/api.ts).
    }
  }

  async function handleRemoveShare(shareId: string) {
    if (!orgId || !proposalId) return;
    try {
      await api.delete(`/api/organizations/${orgId}/proposals/${proposalId}/shares/${shareId}`);
      await fetchShares();
    } catch {
      // Error toast is shown by the global Axios interceptor (lib/api.ts).
    }
  }

  function copyShareLink(token: string) {
    const url = `${window.location.origin}/shared/${token}`;
    void navigator.clipboard.writeText(url);
    toast.success("Link copied!");
  }

  async function handleExport(format: "pdf" | "docx") {
    if (!orgId || !proposalId) return;
    toast.info(format === "pdf" ? "Preparing PDF…" : "Preparing Word document…");
    try {
      const res = await api.get(`/api/organizations/${orgId}/proposals/${proposalId}/export`, {
        params: { format },
        responseType: "blob",
      });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const a = document.createElement("a");
      a.href = url;
      a.download = `proposal.${format}`;
      a.click();
      window.URL.revokeObjectURL(url);
    } catch {
      // Error toast is shown by the global Axios interceptor (lib/api.ts).
    }
  }

  if (authLoading || loading) {
    return (
      <div className="flex items-center gap-2 text-slate-600">
        <Loader2 className="h-4 w-4 animate-spin" /> Loading proposal…
      </div>
    );
  }

  if (!proposal) {
    return <p className="text-slate-600">Proposal not found.</p>;
  }

  return (
    <div className="fixed inset-0 top-16 flex bg-white">
      {/* LEFT PANEL */}
      <div className="flex w-60 shrink-0 flex-col border-r">
        <div className="flex items-center justify-between border-b px-3 py-2">
          <span className="text-sm font-semibold text-slate-900">Sections</span>
          <IconTooltip label="Add section">
            <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => void handleAddSection()}>
              <Plus className="h-4 w-4" />
            </Button>
          </IconTooltip>
        </div>
        <div className="flex-1 overflow-y-auto p-2">
          {sections.length === 0 ? (
            <div className="p-2 text-xs text-slate-500">
              <p className="mb-2">No sections yet.</p>
              <div className="flex flex-wrap gap-1">
                {SECTION_CHIPS.map((chip) => (
                  <button
                    key={chip}
                    onClick={() => void handleAddSection(chip)}
                    className="rounded-full border border-slate-200 px-2 py-1 hover:bg-slate-50"
                  >
                    {chip}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={(e) => void handleDragEnd(e)}>
              <SortableContext items={sections.map((s) => s.id)} strategy={verticalListSortingStrategy}>
                {sections.map((s) => (
                  <SortableSectionItem
                    key={s.id}
                    section={s}
                    active={s.id === activeSectionId}
                    onSelect={() => selectSection(s.id)}
                    onDelete={() => void handleDeleteSection(s.id)}
                  />
                ))}
              </SortableContext>
            </DndContext>
          )}
        </div>
      </div>

      {/* MAIN PANEL */}
      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex h-14 items-center gap-3 border-b px-4">
          <IconTooltip label="Back to proposals">
            <Button variant="ghost" size="icon" asChild>
              <Link href="/dashboard/proposals">
                <ArrowLeft className="h-4 w-4" />
              </Link>
            </Button>
          </IconTooltip>
          <input
            defaultValue={proposal.title}
            onBlur={(e) => void handleTitleBlur(e.target.value)}
            className="min-w-0 flex-1 truncate border-none bg-transparent text-lg font-semibold text-slate-900 outline-none"
          />
          <Select value={statusLabel(proposal.status)} onValueChange={(v) => void handleStatusChange(v)}>
            <SelectTrigger className="h-8 w-32 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Draft">Draft</SelectItem>
              <SelectItem value="InReview">In Review</SelectItem>
              <SelectItem value="Approved">Approved</SelectItem>
              <SelectItem value="Submitted">Submitted</SelectItem>
              <SelectItem value="Archived">Archived</SelectItem>
            </SelectContent>
          </Select>
          <span className="w-28 text-xs text-slate-400">
            {autoSave.state === "pending" || autoSave.state === "saving"
              ? "Saving…"
              : autoSave.state === "saved"
                ? "✓ Saved"
                : autoSave.state === "error"
                  ? "⚠ Save failed"
                  : ""}
          </span>
          <IconTooltip label="Version history">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => {
                setVersionsOpen(true);
                void fetchVersions();
              }}
            >
              <History className="h-4 w-4" />
            </Button>
          </IconTooltip>
          <IconTooltip label="Comments">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => {
                setCommentsOpen(true);
                void fetchComments();
              }}
            >
              <MessageSquare className="h-4 w-4" />
            </Button>
          </IconTooltip>
          <IconTooltip label="Share">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => {
                setShareOpen(true);
                void fetchShares();
              }}
            >
              <Share2 className="h-4 w-4" />
            </Button>
          </IconTooltip>
          <Button variant="outline" size="sm" onClick={() => setGenerateFullOpen(true)}>
            <Wand2 className="h-4 w-4" /> Generate Full Proposal
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm">
                <Download className="h-4 w-4" /> Export
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => void handleExport("pdf")}>Export as PDF</DropdownMenuItem>
              <DropdownMenuItem onClick={() => void handleExport("docx")}>Export as Word (.docx)</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <div className="flex-1 overflow-y-auto">
          {activeSection ? (
            <RichTextEditor
              key={activeSection.id}
              content={activeSection.content}
              onChange={handleEditorChange}
              placeholder="Start writing here, or click 'Generate with AI' →"
              onTransform={async (text, command) => {
                try {
                  const res = await api.post<ApiResponse<{ text: string }>>("/api/ai/transform", {
                    text,
                    command,
                  });
                  return res.data.data?.text ?? text;
                } catch {
                  // Error toast is shown by the global Axios interceptor (lib/api.ts).
                  return text;
                }
              }}
            />
          ) : (
            <div className="flex h-full items-center justify-center text-slate-400">
              Add a section to start writing.
            </div>
          )}
        </div>

        <div className="flex h-8 items-center border-t px-4 text-xs text-slate-500">
          {activeSection ? `${activeSection.wordCount} words in section` : ""} · {proposal.totalWordCount} words total
        </div>
      </div>

      {/* RIGHT PANEL */}
      {rightPanelOpen ? (
        <div className="flex w-80 shrink-0 flex-col border-l">
          <div className="flex items-center justify-between border-b px-3 py-2">
            <span className="flex items-center gap-1 text-sm font-semibold text-slate-900">
              <Sparkles className="h-4 w-4" /> AI Assistant
            </span>
            <IconTooltip label="Close panel">
              <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setRightPanelOpen(false)}>
                <X className="h-4 w-4" />
              </Button>
            </IconTooltip>
          </div>
          <Tabs value={rightPanelTab} onValueChange={(v) => setRightPanelTab(v as "generate" | "compliance")}>
            <TabsList className="m-2">
              <TabsTrigger value="generate">Generate</TabsTrigger>
              <TabsTrigger value="compliance">Compliance</TabsTrigger>
            </TabsList>
          </Tabs>

          <div className="flex-1 overflow-y-auto p-3">
            {rightPanelTab === "generate" ? (
              <div className="space-y-3">
                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-600">Tone</label>
                  <Select value={tone} onValueChange={setTone}>
                    <SelectTrigger className="h-8 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="formal">Formal</SelectItem>
                      <SelectItem value="confident">Confident</SelectItem>
                      <SelectItem value="technical">Technical</SelectItem>
                      <SelectItem value="friendly">Friendly</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <label className="flex items-center gap-2 text-xs text-slate-600">
                  <input
                    type="checkbox"
                    checked={useRfpContext}
                    onChange={(e) => setUseRfpContext(e.target.checked)}
                  />
                  Use RFP Requirements
                </label>
                <p className="text-xs text-slate-400">This usually takes 20–40 seconds.</p>
                <Button
                  className="w-full"
                  disabled={!activeSection || generating}
                  onClick={() => void handleGenerate()}
                >
                  {generating ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                  Generate Section
                </Button>

                {generatedPreview ? (
                  <div className="space-y-2 rounded-lg border bg-slate-50 p-3">
                    <p className="whitespace-pre-wrap text-xs text-slate-700">{generatedPreview}</p>
                    <div className="flex gap-2">
                      <Button size="sm" className="flex-1" onClick={insertGenerated}>
                        Insert into Editor
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => void handleGenerate()}>
                        Regenerate
                      </Button>
                    </div>
                  </div>
                ) : null}
              </div>
            ) : (
              <div className="space-y-3">
                <Button
                  className="w-full"
                  disabled={complianceLoading}
                  onClick={() => void handleCheckCompliance()}
                >
                  {complianceLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Scale className="h-4 w-4" />}
                  Run Compliance Check
                </Button>
                {complianceLoading ? (
                  <p className="text-xs text-slate-500">Analyzing requirements…</p>
                ) : complianceResult ? (
                  <div className="space-y-3">
                    <div className="text-center">
                      <div
                        className={`mx-auto flex h-16 w-16 items-center justify-center rounded-full border-4 text-lg font-semibold ${
                          complianceResult.overallScore < 0.5
                            ? "border-red-400 text-red-600"
                            : complianceResult.overallScore < 0.8
                              ? "border-amber-400 text-amber-600"
                              : "border-emerald-400 text-emerald-600"
                        }`}
                      >
                        {Math.round(complianceResult.overallScore * 100)}%
                      </div>
                      <Button variant="link" size="sm" onClick={() => void handleCheckCompliance()}>
                        Run Again
                      </Button>
                    </div>
                    <ul className="space-y-2">
                      {complianceResult.requirements.map((r) => (
                        <li key={r.reqId} className="rounded-lg border p-2 text-xs">
                          <div className="flex items-center justify-between">
                            <span className="font-medium">
                              {r.score >= 0.8 ? "✅" : r.score >= 0.5 ? "⚠️" : "❌"} {r.reqId}
                            </span>
                            <span>{Math.round(r.score * 100)}%</span>
                          </div>
                          <p className="mt-1 line-clamp-2 text-slate-600">{r.description}</p>
                          {r.score < 0.8 ? <p className="mt-1 text-slate-400">{r.rationale}</p> : null}
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : (
                  <p className="text-xs text-slate-500">
                    Runs each mandatory requirement against your current section content.
                  </p>
                )}
              </div>
            )}
          </div>
        </div>
      ) : (
        <button
          onClick={() => setRightPanelOpen(true)}
          className="flex w-8 shrink-0 items-center justify-center border-l text-slate-400 hover:bg-slate-50"
          aria-label="Open AI panel"
        >
          <Sparkles className="h-4 w-4" />
        </button>
      )}

      {/* Comments sheet */}
      <Sheet open={commentsOpen} onOpenChange={setCommentsOpen}>
        <SheetContent side="right" className="w-96">
          <SheetHeader>
            <SheetTitle>Comments</SheetTitle>
            <SheetDescription>{activeSection ? `On "${activeSection.title}"` : ""}</SheetDescription>
          </SheetHeader>
          <div className="mt-4 space-y-4 overflow-y-auto">
            {comments.length === 0 ? (
              <p className="text-sm text-slate-500">No comments yet.</p>
            ) : (
              comments.map((c) => (
                <div key={c.id} className="rounded-lg border p-3 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-slate-900">{c.userName || "Someone"}</span>
                    <Badge variant={String(c.status) === "Resolved" ? "secondary" : "outline"}>
                      {String(c.status)}
                    </Badge>
                  </div>
                  {c.anchorText ? <p className="mt-1 text-xs italic text-slate-500">“{c.anchorText}”</p> : null}
                  <p className="mt-1 text-slate-700">{c.commentText}</p>
                  <div className="mt-2 space-y-2 pl-3">
                    {c.replies.map((r) => (
                      <div key={r.id} className="text-xs text-slate-600">
                        <span className="font-medium">{r.userName}: </span>
                        {r.commentText}
                      </div>
                    ))}
                    <div className="flex gap-1">
                      <Input
                        value={replyDrafts[c.id] ?? ""}
                        onChange={(e) => setReplyDrafts((prev) => ({ ...prev, [c.id]: e.target.value }))}
                        placeholder="Reply…"
                        className="h-7 text-xs"
                      />
                      <Button size="sm" variant="outline" onClick={() => void handleReply(c.id)}>
                        Send
                      </Button>
                    </div>
                  </div>
                  {String(c.status) !== "Resolved" ? (
                    <Button variant="link" size="sm" className="mt-1 h-auto p-0" onClick={() => void handleResolve(c.id)}>
                      Resolve
                    </Button>
                  ) : null}
                </div>
              ))
            )}
          </div>
          <div className="mt-4 space-y-2 border-t pt-4">
            <Textarea
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              placeholder="Add a comment on this section…"
            />
            <Button size="sm" onClick={() => void handleAddComment()} disabled={!newComment.trim()}>
              Comment
            </Button>
          </div>
        </SheetContent>
      </Sheet>

      {/* Version history sheet */}
      <Sheet open={versionsOpen} onOpenChange={setVersionsOpen}>
        <SheetContent side="right" className="w-96">
          <SheetHeader>
            <SheetTitle>Version History</SheetTitle>
          </SheetHeader>
          {previewVersion ? (
            <div className="mt-4 space-y-3">
              <Button variant="outline" size="sm" onClick={() => setPreviewVersion(null)}>
                ← Back to list
              </Button>
              <p className="text-sm font-medium">v{previewVersion.versionNumber} · {previewVersion.changeSummary}</p>
              <div className="max-h-96 space-y-3 overflow-y-auto rounded border p-2">
                {previewVersion.sections.map((s) => (
                  <div key={s.id}>
                    <p className="text-xs font-semibold text-slate-700">{s.title}</p>
                    <p className="text-xs text-slate-500">{s.wordCount} words</p>
                  </div>
                ))}
              </div>
              <Button size="sm" onClick={() => void handleRestoreVersion(previewVersion.id)}>
                Restore this version
              </Button>
            </div>
          ) : (
            <div className="mt-4 space-y-2 overflow-y-auto">
              {versions.length === 0 ? (
                <p className="text-sm text-slate-500">No versions yet — versions are saved as you edit.</p>
              ) : (
                versions.map((v) => (
                  <button
                    key={v.id}
                    onClick={() => void handleViewVersion(v.id)}
                    className="block w-full rounded-lg border p-2 text-left text-sm hover:bg-slate-50"
                  >
                    <p className="font-medium">v{v.versionNumber}</p>
                    <p className="text-xs text-slate-500">
                      {new Date(v.createdAt).toLocaleString()} · {v.createdByName || "Someone"}
                    </p>
                    <p className="text-xs text-slate-400">{v.changeSummary}</p>
                  </button>
                ))
              )}
            </div>
          )}
        </SheetContent>
      </Sheet>

      {/* Share dialog */}
      <Dialog open={shareOpen} onOpenChange={setShareOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Share proposal</DialogTitle>
            <DialogDescription>Invite someone by email, or copy an existing share link.</DialogDescription>
          </DialogHeader>
          <div className="flex gap-2">
            <Input
              value={shareEmail}
              onChange={(e) => setShareEmail(e.target.value)}
              placeholder="email@example.com"
            />
            <Button onClick={() => void handleShare()} disabled={!shareEmail.trim()}>
              Send
            </Button>
          </div>
          <div className="space-y-2">
            {shares.map((s) => (
              <div key={s.id} className="flex items-center justify-between rounded border p-2 text-sm">
                <div>
                  <p>{s.sharedWithEmail}</p>
                  <p className="text-xs text-slate-400">{String(s.permission)}</p>
                </div>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" onClick={() => copyShareLink(s.shareToken)}>
                    Copy Link
                  </Button>
                  <Button size="sm" variant="ghost" className="text-red-600" onClick={() => void handleRemoveShare(s.id)}>
                    Remove
                  </Button>
                </div>
              </div>
            ))}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShareOpen(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Generate full proposal dialog */}
      <Dialog open={generateFullOpen} onOpenChange={(open) => !generatingFull && setGenerateFullOpen(open)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Generate Full Proposal</DialogTitle>
            <DialogDescription>
              Creates 8 standard sections (Executive Summary, Technical Approach, Pricing, etc.) from
              your linked RFP analysis. Existing sections with the same title are overwritten.
            </DialogDescription>
          </DialogHeader>

          {generatingFull ? (
            <div className="flex flex-col items-center gap-2 py-6 text-sm text-slate-600">
              <Loader2 className="h-6 w-6 animate-spin" />
              Generating all sections… this can take a minute.
            </div>
          ) : (
            <div>
              <label className="mb-1.5 block text-xs font-medium text-slate-600">Tone</label>
              <Select value={generateFullTone} onValueChange={setGenerateFullTone}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="formal">Formal</SelectItem>
                  <SelectItem value="confident">Confident</SelectItem>
                  <SelectItem value="technical">Technical</SelectItem>
                  <SelectItem value="friendly">Friendly</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" disabled={generatingFull} onClick={() => setGenerateFullOpen(false)}>
              Cancel
            </Button>
            <Button disabled={generatingFull} onClick={() => void handleGenerateFull()}>
              Generate
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

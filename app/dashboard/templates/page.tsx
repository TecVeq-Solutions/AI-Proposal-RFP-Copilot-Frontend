"use client";

import { useCallback, useEffect, useState } from "react";
import { useDropzone } from "react-dropzone";
import { BookOpen, FileText, Loader2, Trash2, Upload } from "lucide-react";
import { toast } from "sonner";
import { useConfirm } from "@/components/confirm-provider";
import { EmptyState } from "@/components/empty-state";
import { ErrorState } from "@/components/error-state";
import { ProposalCardSkeleton } from "@/components/skeletons";
import api from "@/lib/api";
import { useAuth } from "@/components/providers/auth-provider";
import type { ApiResponse, DocumentItem, DocumentListResponse } from "@/lib/types";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const MAX_BYTES = 25 * 1024 * 1024;

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function TemplatesPage() {
  const { currentOrg, loading: authLoading } = useAuth();
  const confirm = useConfirm();
  const orgId = currentOrg?.id;

  const [templates, setTemplates] = useState<DocumentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);

  const [uploadOpen, setUploadOpen] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [description, setDescription] = useState("");
  const [uploading, setUploading] = useState(false);

  const [useOpen, setUseOpen] = useState(false);
  const [useTarget, setUseTarget] = useState<DocumentItem | null>(null);
  const [proposalTitle, setProposalTitle] = useState("");

  const fetchTemplates = useCallback(async () => {
    if (!orgId) return;
    setLoadError(false);
    try {
      const res = await api.get<ApiResponse<DocumentListResponse>>(
        `/api/organizations/${orgId}/documents`,
        { params: { page: 1, pageSize: 100 } }
      );
      if (res.data.success && res.data.data) {
        setTemplates(
          res.data.data.items.filter(
            (d) => String(d.type).toLowerCase() === "template"
          )
        );
      }
    } catch {
      // Error toast is shown by the global Axios interceptor (lib/api.ts).
      setLoadError(true);
    } finally {
      setLoading(false);
    }
  }, [orgId]);

  useEffect(() => {
    if (!authLoading && orgId) {
      setLoading(true);
      void fetchTemplates();
    }
  }, [authLoading, orgId, fetchTemplates]);

  const onDrop = useCallback((accepted: File[]) => {
    const next = accepted[0];
    if (!next) return;
    if (next.size > MAX_BYTES) {
      toast.error("File exceeds 25MB limit");
      return;
    }
    setFile(next);
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    multiple: false,
    accept: {
      "application/pdf": [".pdf"],
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document": [
        ".docx",
      ],
      "application/msword": [".doc"],
    },
    maxSize: MAX_BYTES,
  });

  async function handleUpload() {
    if (!orgId || !file) return;
    setUploading(true);
    try {
      const form = new FormData();
      form.append("file", file);
      form.append("type", "Template");
      if (description.trim()) form.append("description", description.trim());

      await api.post(`/api/organizations/${orgId}/documents/upload`, form, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      toast.success("Template uploaded");
      setUploadOpen(false);
      setFile(null);
      setDescription("");
      await fetchTemplates();
    } catch {
      // Error toast is shown by the global Axios interceptor (lib/api.ts).
    } finally {
      setUploading(false);
    }
  }

  async function handleDelete(doc: DocumentItem) {
    if (!orgId) return;
    if (!(await confirm({ description: `Delete “${doc.name}”?` }))) return;
    try {
      await api.delete(`/api/organizations/${orgId}/documents/${doc.id}`);
      toast.success("Template deleted");
      await fetchTemplates();
    } catch {
      // Error toast is shown by the global Axios interceptor (lib/api.ts).
    }
  }

  function openUseTemplate(doc: DocumentItem) {
    setUseTarget(doc);
    setProposalTitle("");
    setUseOpen(true);
  }

  function handleUseTemplate() {
    // Proposal generation lands in Phase 5 (Days 36+) — no /api/proposals endpoint yet.
    toast.info(
      "Proposal generation is coming in Phase 5. This will create a proposal from this template once it ships."
    );
    setUseOpen(false);
  }

  if (authLoading || loading) {
    return (
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {[0, 1, 2].map((i) => (
          <ProposalCardSkeleton key={i} />
        ))}
      </div>
    );
  }

  if (!orgId) {
    return <p className="text-slate-600">Select an organization to manage templates.</p>;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">Templates</h2>
          <p className="text-sm text-slate-500">
            Reusable proposal templates your team can start new proposals from.
          </p>
        </div>
        <Button onClick={() => setUploadOpen(true)}>
          <Upload className="h-4 w-4" /> Upload Template
        </Button>
      </div>

      {loadError ? (
        <ErrorState message="Could not load templates." onRetry={() => void fetchTemplates()} />
      ) : templates.length === 0 ? (
        <EmptyState
          icon={BookOpen}
          title="No templates"
          description="Upload a proposal template to reuse across proposals."
          action={{ label: "Upload a template", onClick: () => setUploadOpen(true) }}
        />
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {templates.map((doc) => (
            <Card key={doc.id} className="flex flex-col gap-3 p-4">
              <div className="flex items-start gap-2">
                <FileText className="mt-0.5 h-4 w-4 shrink-0 text-blue-600" />
                <span className="font-semibold text-slate-900">{doc.name}</span>
              </div>
              <p className="line-clamp-2 flex-1 text-sm text-slate-500">
                {doc.description || "No description yet."}
              </p>
              <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-slate-500">
                {doc.pageCount ? <span>{doc.pageCount} pages</span> : null}
                {doc.wordCount ? <span>{doc.wordCount.toLocaleString()} words</span> : null}
                <span>{formatBytes(doc.fileSize)}</span>
              </div>
              <p className="text-xs text-slate-400">Never used</p>
              <div className="mt-1 flex items-center gap-2">
                <Button size="sm" className="flex-1" onClick={() => openUseTemplate(doc)}>
                  Use Template
                </Button>
                <Button
                  size="icon"
                  variant="ghost"
                  className="text-red-600 hover:text-red-700"
                  onClick={() => void handleDelete(doc)}
                  aria-label="Delete template"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={uploadOpen} onOpenChange={setUploadOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Upload template</DialogTitle>
            <DialogDescription>PDF, DOCX, or DOC — max 25MB.</DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div
              {...getRootProps()}
              className={`cursor-pointer rounded-lg border border-dashed px-4 py-10 text-center transition ${
                isDragActive ? "border-slate-900 bg-slate-50" : "border-slate-300 bg-white"
              }`}
            >
              <input {...getInputProps()} />
              {file ? (
                <p className="text-sm text-slate-700">
                  {file.name} ({formatBytes(file.size)})
                </p>
              ) : (
                <p className="text-sm text-slate-500">
                  Drag and drop a file here, or click to browse
                </p>
              )}
            </div>

            <div>
              <Label htmlFor="template-description" className="mb-1.5 block">
                Description
              </Label>
              <Input
                id="template-description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="e.g. Standard federal RFP response template"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setUploadOpen(false)}>
              Cancel
            </Button>
            <Button disabled={!file || uploading} onClick={() => void handleUpload()}>
              {uploading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" /> Uploading…
                </>
              ) : (
                "Upload"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={useOpen} onOpenChange={setUseOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Use template</DialogTitle>
            <DialogDescription>
              Start a new proposal from “{useTarget?.name}”.
            </DialogDescription>
          </DialogHeader>

          <div>
            <Label htmlFor="proposal-title" className="mb-1.5 block">
              Proposal title
            </Label>
            <Input
              id="proposal-title"
              value={proposalTitle}
              onChange={(e) => setProposalTitle(e.target.value)}
              placeholder="e.g. Acme Corp — Q4 RFP Response"
            />
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setUseOpen(false)}>
              Cancel
            </Button>
            <Button disabled={!proposalTitle.trim()} onClick={handleUseTemplate}>
              Create Proposal
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

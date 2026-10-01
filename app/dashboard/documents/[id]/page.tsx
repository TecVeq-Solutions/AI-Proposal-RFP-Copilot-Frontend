"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { Loader2, RefreshCw, Download, Trash2 } from "lucide-react";
import { toast } from "sonner";
import api from "@/lib/api";
import { useAuth } from "@/components/providers/auth-provider";
import type {
  ApiResponse,
  DocumentItem,
  DocumentStatus,
  PresignedUrlResponse,
} from "@/lib/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

function statusLabel(status: DocumentStatus): string {
  if (typeof status === "number") {
    return ["Uploaded", "Processing", "Ready", "Failed"][status] ?? String(status);
  }
  return String(status);
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function StatusBadge({ status }: { status: DocumentStatus }) {
  const label = statusLabel(status);
  const className =
    label === "Ready"
      ? "border-emerald-200 bg-emerald-50 text-emerald-800"
      : label === "Failed"
        ? "border-red-200 bg-red-50 text-red-800"
        : label === "Processing"
          ? "border-amber-200 bg-amber-50 text-amber-800"
          : "border-slate-200 bg-slate-50 text-slate-700";

  return (
    <Badge variant="outline" className={className}>
      {label === "Processing" ? (
        <Loader2 className="mr-1 h-3 w-3 animate-spin" />
      ) : null}
      {label}
    </Badge>
  );
}

export default function DocumentDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { currentOrg, loading: authLoading } = useAuth();
  const orgId = currentOrg?.id;
  const docId = params.id;

  const [doc, setDoc] = useState<DocumentItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  const fetchDoc = useCallback(async () => {
    if (!orgId || !docId) return;
    try {
      const res = await api.get<ApiResponse<DocumentItem>>(
        `/api/organizations/${orgId}/documents/${docId}`
      );
      if (res.data.success && res.data.data) {
        setDoc(res.data.data);
      }
    } catch {
      toast.error("Failed to load document");
    } finally {
      setLoading(false);
    }
  }, [orgId, docId]);

  useEffect(() => {
    if (!authLoading && orgId && docId) {
      setLoading(true);
      void fetchDoc();
    }
  }, [authLoading, orgId, docId, fetchDoc]);

  useEffect(() => {
    if (!doc || statusLabel(doc.status) !== "Processing") return;
    const id = window.setInterval(() => void fetchDoc(), 5000);
    return () => window.clearInterval(id);
  }, [doc, fetchDoc]);

  async function handleReprocess() {
    if (!orgId || !docId) return;
    setBusy(true);
    try {
      await api.post(`/api/organizations/${orgId}/documents/${docId}/reprocess`);
      toast.success("Re-processing queued");
      await fetchDoc();
    } catch {
      toast.error("Re-process failed");
    } finally {
      setBusy(false);
    }
  }

  async function handleDownload() {
    if (!orgId || !docId) return;
    try {
      const res = await api.get<ApiResponse<PresignedUrlResponse>>(
        `/api/organizations/${orgId}/documents/${docId}/download`
      );
      if (res.data.success && res.data.data?.url) {
        window.open(res.data.data.url, "_blank", "noopener,noreferrer");
      }
    } catch {
      toast.error("Download failed");
    }
  }

  async function handleDelete() {
    if (!orgId || !docId) return;
    setBusy(true);
    try {
      await api.delete(`/api/organizations/${orgId}/documents/${docId}`);
      toast.success("Document deleted");
      router.push("/dashboard/documents");
    } catch {
      toast.error("Delete failed");
      setBusy(false);
    }
  }

  if (authLoading || loading) {
    return (
      <div className="flex items-center gap-2 text-slate-600">
        <Loader2 className="h-4 w-4 animate-spin" /> Loading…
      </div>
    );
  }

  if (!doc) {
    return <p className="text-slate-600">Document not found.</p>;
  }

  const processing = statusLabel(doc.status) === "Processing";

  return (
    <div className="space-y-4">
      <nav className="text-sm text-slate-500">
        <Link href="/dashboard/documents" className="hover:text-slate-800">
          Documents
        </Link>
        <span className="mx-2">/</span>
        <span className="text-slate-800">{doc.name}</span>
      </nav>

      <div className="grid gap-4 lg:grid-cols-[65%_35%]">
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex flex-wrap items-center gap-2">
                <CardTitle className="text-xl">{doc.name}</CardTitle>
                <StatusBadge status={doc.status} />
              </div>
              <CardDescription>
                {String(doc.type)} · {formatBytes(doc.fileSize)}
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-3 text-sm text-slate-600 sm:grid-cols-2">
              <div>
                <p className="text-xs uppercase tracking-wide text-slate-400">
                  Pages
                </p>
                <p>{doc.pageCount ?? "—"}</p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-wide text-slate-400">
                  Words
                </p>
                <p>{doc.wordCount ?? "—"}</p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-wide text-slate-400">
                  Uploaded by
                </p>
                <p>{doc.uploadedByName || "—"}</p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-wide text-slate-400">
                  Date
                </p>
                <p>{new Date(doc.createdAt).toLocaleString()}</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0">
              <CardTitle className="text-base">Extracted text</CardTitle>
              <Badge variant="secondary">{doc.chunkCount} chunks extracted</Badge>
            </CardHeader>
            <CardContent>
              {processing ? (
                <div className="space-y-2">
                  <div className="h-4 w-2/3 animate-pulse rounded bg-slate-100" />
                  <div className="h-4 w-full animate-pulse rounded bg-slate-100" />
                  <div className="h-4 w-5/6 animate-pulse rounded bg-slate-100" />
                  <div className="h-4 w-4/5 animate-pulse rounded bg-slate-100" />
                </div>
              ) : (
                <>
                  {doc.extractedTextTotalChars != null &&
                  doc.extractedTextTotalChars > 12000 ? (
                    <p className="mb-2 text-xs text-slate-500">
                      Showing first 12,000 of {doc.extractedTextTotalChars.toLocaleString()}{" "}
                      characters. Full text is stored in {doc.chunkCount} chunks for search/RAG.
                    </p>
                  ) : null}
                  <pre className="max-h-[420px] overflow-auto rounded-lg bg-slate-950 p-4 font-mono text-xs leading-relaxed text-slate-100 whitespace-pre-wrap">
                    {doc.extractedTextPreview || "No extracted text yet."}
                  </pre>
                </>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Actions</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-2">
              <Button
                variant="outline"
                disabled={busy || processing}
                onClick={() => void handleReprocess()}
              >
                <RefreshCw className="h-4 w-4" /> Re-process
              </Button>
              <Button variant="outline" onClick={() => void handleDownload()}>
                <Download className="h-4 w-4" /> Download Original
              </Button>
              <Button
                variant="destructive"
                disabled={busy}
                onClick={() => setDeleteOpen(true)}
              >
                <Trash2 className="h-4 w-4" /> Delete
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Processing info</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm text-slate-600">
              <div className="flex justify-between gap-2">
                <span>Chunk count</span>
                <span className="font-medium text-slate-900">{doc.chunkCount}</span>
              </div>
              <div className="flex justify-between gap-2">
                <span>Has embeddings?</span>
                <span className="font-medium text-slate-900">
                  {doc.hasEmbeddings ? "Yes" : "No"}
                </span>
              </div>
              <div className="flex justify-between gap-2">
                <span>Updated</span>
                <span className="font-medium text-slate-900">
                  {new Date(doc.updatedAt).toLocaleString()}
                </span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete document?</DialogTitle>
            <DialogDescription>
              This removes “{doc.name}” and its extracted chunks. This cannot be
              undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              disabled={busy}
              onClick={() => void handleDelete()}
            >
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

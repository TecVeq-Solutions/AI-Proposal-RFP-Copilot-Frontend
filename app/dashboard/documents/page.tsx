"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useDropzone } from "react-dropzone";
import {
  FileText,
  FolderOpen,
  Loader2,
  MoreHorizontal,
  Search,
  Sparkles,
  Trash2,
  Upload,
  Download,
  Eye,
  X,
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
  DocumentSearchResponse,
  DocumentSearchResult,
  DocumentStatus,
  DocumentType,
  PresignedUrlResponse,
} from "@/lib/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

type SearchMode = "name" | "semantic";

const MAX_BYTES = 25 * 1024 * 1024;

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatRelative(iso: string): string {
  const then = new Date(iso).getTime();
  const diff = Date.now() - then;
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins} min ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} hour${hours === 1 ? "" : "s"} ago`;
  const days = Math.floor(hours / 24);
  return `${days} day${days === 1 ? "" : "s"} ago`;
}

function statusLabel(status: DocumentStatus): string {
  if (typeof status === "number") {
    return ["Uploaded", "Processing", "Ready", "Failed"][status] ?? String(status);
  }
  return String(status);
}

function StatusBadge({ status }: { status: DocumentStatus }) {
  const label = statusLabel(status);
  const processing = label === "Processing";
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
      {processing ? <Loader2 className="mr-1 h-3 w-3 animate-spin" /> : null}
      {label}
    </Badge>
  );
}

function FileIcon({ name, mimeType }: { name: string; mimeType: string }) {
  const isPdf =
    mimeType.includes("pdf") || name.toLowerCase().endsWith(".pdf");
  return (
    <FileText
      className={`h-4 w-4 shrink-0 ${isPdf ? "text-red-600" : "text-blue-600"}`}
    />
  );
}

export default function DocumentsPage() {
  const { currentOrg, loading: authLoading } = useAuth();
  const confirm = useConfirm();
  const orgId = currentOrg?.id;

  const [docs, setDocs] = useState<DocumentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [docType, setDocType] = useState<DocumentType>("Rfp");
  const [file, setFile] = useState<File | null>(null);
  const [progress, setProgress] = useState(0);
  const [uploading, setUploading] = useState(false);

  const [searchMode, setSearchMode] = useState<SearchMode>("name");
  const [searchInput, setSearchInput] = useState("");
  const [semanticQuery, setSemanticQuery] = useState<string | null>(null);
  const [semanticResults, setSemanticResults] = useState<DocumentSearchResult[] | null>(null);
  const [semanticLoading, setSemanticLoading] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const fetchDocs = useCallback(async () => {
    if (!orgId) return;
    try {
      setLoadError(false);
      const res = await api.get<ApiResponse<DocumentListResponse>>(
        `/api/organizations/${orgId}/documents`,
        { params: { page: 1, pageSize: 50 } }
      );
      if (res.data.success && res.data.data) {
        setDocs(res.data.data.items);
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
      void fetchDocs();
    }
  }, [authLoading, orgId, fetchDocs]);

  const hasProcessing = useMemo(
    () => docs.some((d) => statusLabel(d.status) === "Processing"),
    [docs]
  );

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  const filteredDocs = useMemo(() => {
    if (searchMode !== "name" || !searchInput.trim()) return docs;
    const q = searchInput.trim().toLowerCase();
    return docs.filter((d) => d.name.toLowerCase().includes(q));
  }, [docs, searchMode, searchInput]);

  async function runSemanticSearch() {
    if (!orgId || !searchInput.trim()) return;
    setSemanticLoading(true);
    setSemanticResults(null);
    setSemanticQuery(searchInput.trim());
    try {
      const res = await api.post<ApiResponse<DocumentSearchResponse>>(
        `/api/organizations/${orgId}/documents/search`,
        { query: searchInput.trim() }
      );
      if (res.data.success && res.data.data) {
        setSemanticResults(res.data.data.results);
      } else {
        toast.error(res.data.message || "Search failed");
        setSemanticResults([]);
      }
    } catch {
      // Error toast is shown by the global Axios interceptor (lib/api.ts).
      setSemanticResults([]);
    } finally {
      setSemanticLoading(false);
    }
  }

  function clearSearch() {
    setSearchInput("");
    setSemanticQuery(null);
    setSemanticResults(null);
  }

  function handleSearchSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (searchMode === "semantic") {
      void runSemanticSearch();
    }
  }

  useEffect(() => {
    if (!hasProcessing || !orgId) return;
    const id = window.setInterval(() => {
      void fetchDocs();
    }, 5000);
    return () => window.clearInterval(id);
  }, [hasProcessing, orgId, fetchDocs]);

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
    onDropRejected: (rejections) => {
      const tooLarge = rejections.some((r) => r.errors.some((e) => e.code === "file-too-large"));
      toast.error(tooLarge ? "File exceeds 25MB limit" : "Unsupported file type. Upload a PDF or Word (.docx) file.");
    },
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
    setProgress(0);
    try {
      const form = new FormData();
      form.append("file", file);
      form.append("type", String(docType));

      await api.post<ApiResponse<DocumentItem>>(
        `/api/organizations/${orgId}/documents/upload`,
        form,
        {
          headers: { "Content-Type": "multipart/form-data" },
          onUploadProgress: (evt) => {
            if (!evt.total) return;
            setProgress(Math.round((evt.loaded / evt.total) * 100));
          },
        }
      );

      toast.success("Upload started");
      setUploadOpen(false);
      setFile(null);
      setProgress(0);
      await fetchDocs();
    } catch {
      // Error toast is shown by the global Axios interceptor (lib/api.ts).
    } finally {
      setUploading(false);
    }
  }

  async function handleDownload(doc: DocumentItem) {
    if (!orgId) return;
    try {
      const res = await api.get<ApiResponse<PresignedUrlResponse>>(
        `/api/organizations/${orgId}/documents/${doc.id}/download`
      );
      if (res.data.success && res.data.data?.url) {
        window.open(res.data.data.url, "_blank", "noopener,noreferrer");
      }
    } catch {
      // Error toast is shown by the global Axios interceptor (lib/api.ts).
    }
  }

  async function handleDelete(doc: DocumentItem) {
    if (!orgId) return;
    if (!(await confirm({ description: `Delete “${doc.name}”?` }))) return;
    try {
      await api.delete(`/api/organizations/${orgId}/documents/${doc.id}`);
      toast.success("Document deleted");
      await fetchDocs();
    } catch {
      // Error toast is shown by the global Axios interceptor (lib/api.ts).
    }
  }

  if (authLoading || loading) {
    return (
      <div className="rounded-xl border bg-white">
        {[0, 1, 2, 3, 4].map((i) => (
          <DocumentRowSkeleton key={i} />
        ))}
      </div>
    );
  }

  if (!orgId) {
    return (
      <p className="text-slate-600">
        Select an organization to manage documents.
      </p>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">Documents</h2>
          <p className="text-sm text-slate-500">
            Upload RFPs, proposals, and templates for extraction.
          </p>
        </div>
        <Button onClick={() => setUploadOpen(true)}>
          <Upload className="h-4 w-4" /> Upload
        </Button>
      </div>

      {docs.length > 0 ? (
        <div className="space-y-2">
          <form onSubmit={handleSearchSubmit} className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <Input
                ref={searchInputRef}
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                placeholder={
                  searchMode === "semantic"
                    ? "Ask across all documents… (e.g. payment terms)"
                    : "Search across all documents… (⌘K)"
                }
                className="pl-9 pr-9"
              />
              {searchInput ? (
                <button
                  type="button"
                  onClick={clearSearch}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  aria-label="Clear search"
                >
                  <X className="h-4 w-4" />
                </button>
              ) : null}
            </div>
            <div className="flex gap-2">
              <Button
                type="button"
                variant={searchMode === "name" ? "default" : "outline"}
                size="sm"
                onClick={() => {
                  setSearchMode("name");
                  setSemanticQuery(null);
                  setSemanticResults(null);
                }}
              >
                Filter by name
              </Button>
              <Button
                type="button"
                variant={searchMode === "semantic" ? "default" : "outline"}
                size="sm"
                onClick={() => setSearchMode("semantic")}
              >
                <Sparkles className="h-4 w-4" /> AI Semantic Search
              </Button>
              {searchMode === "semantic" ? (
                <Button type="submit" size="sm" disabled={!searchInput.trim() || semanticLoading}>
                  {semanticLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Search"}
                </Button>
              ) : null}
              {searchInput ? (
                <Button type="button" variant="ghost" size="sm" onClick={clearSearch}>
                  Clear Search
                </Button>
              ) : null}
            </div>
          </form>
        </div>
      ) : null}

      {searchMode === "semantic" && semanticQuery ? (
        semanticLoading ? (
          <div className="flex items-center gap-2 rounded-xl border bg-white px-4 py-10 text-slate-600">
            <Loader2 className="h-4 w-4 animate-spin" /> Searching with AI…
          </div>
        ) : (
          <div className="space-y-3">
            <p className="text-sm text-slate-500">
              Found {semanticResults?.length ?? 0} passage
              {semanticResults?.length === 1 ? "" : "s"} across{" "}
              {new Set(semanticResults?.map((r) => r.documentId)).size} document
              {new Set(semanticResults?.map((r) => r.documentId)).size === 1 ? "" : "s"}
            </p>
            {semanticResults && semanticResults.length > 0 ? (
              semanticResults.map((r) => (
                <div key={r.chunkId} className="rounded-xl border bg-white p-4">
                  <div className="mb-2 flex items-center justify-between gap-2">
                    <span className="font-medium text-slate-900">{r.documentName}</span>
                    <Button variant="outline" size="sm" asChild>
                      <Link href={`/dashboard/documents/${r.documentId}`}>View Document</Link>
                    </Button>
                  </div>
                  <p className="mb-3 line-clamp-3 text-sm text-slate-600">{r.content}</p>
                  <div className="flex items-center gap-2">
                    <div className="h-1.5 flex-1 overflow-hidden rounded bg-slate-100">
                      <div
                        className="h-full bg-slate-900"
                        style={{ width: `${Math.round(Math.max(0, Math.min(1, r.similarityScore)) * 100)}%` }}
                      />
                    </div>
                    <span className="text-xs text-slate-500">
                      {Math.round(Math.max(0, Math.min(1, r.similarityScore)) * 100)}% match
                    </span>
                  </div>
                </div>
              ))
            ) : (
              <div className="rounded-xl border border-dashed border-slate-300 bg-white px-6 py-12 text-center text-slate-600">
                No passages matched that search.
              </div>
            )}
          </div>
        )
      ) : loadError ? (
        <ErrorState message="Could not load documents." onRetry={() => void fetchDocs()} />
      ) : docs.length === 0 ? (
        <EmptyState
          icon={FolderOpen}
          title="No documents"
          description="Upload your first RFP or proposal."
          action={{ label: "Upload your first document", onClick: () => setUploadOpen(true) }}
        />
      ) : filteredDocs.length === 0 ? (
        <EmptyState icon={Search} title="No results found" description="Try different keywords." />
      ) : (
        <div className="rounded-xl border bg-white">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Size</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Uploaded</TableHead>
                <TableHead className="w-[120px]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredDocs.map((doc) => (
                <TableRow key={doc.id}>
                  <TableCell>
                    <div className="flex items-center gap-2 font-medium text-slate-900">
                      <FileIcon name={doc.name} mimeType={doc.mimeType} />
                      <span className="truncate max-w-[280px]">{doc.name}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary">{String(doc.type)}</Badge>
                  </TableCell>
                  <TableCell>{formatBytes(doc.fileSize)}</TableCell>
                  <TableCell>
                    <StatusBadge status={doc.status} />
                  </TableCell>
                  <TableCell className="text-slate-500">
                    {formatRelative(doc.createdAt)}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <Button variant="ghost" size="icon" asChild>
                        <Link href={`/dashboard/documents/${doc.id}`}>
                          <Eye className="h-4 w-4" />
                        </Link>
                      </Button>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => void handleDownload(doc)}>
                            <Download className="h-4 w-4" /> Download
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            className="text-red-600"
                            onClick={() => void handleDelete(doc)}
                          >
                            <Trash2 className="h-4 w-4" /> Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <Dialog open={uploadOpen} onOpenChange={setUploadOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Upload document</DialogTitle>
            <DialogDescription>
              PDF, DOCX, or DOC — max 25MB.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <label className="mb-1.5 block text-sm font-medium">Type</label>
              <Select
                value={String(docType)}
                onValueChange={(v) => setDocType(v as DocumentType)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Rfp">RFP</SelectItem>
                  <SelectItem value="Proposal">Proposal</SelectItem>
                  <SelectItem value="Template">Template</SelectItem>
                  <SelectItem value="Other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div
              {...getRootProps()}
              className={`cursor-pointer rounded-lg border border-dashed px-4 py-10 text-center transition ${
                isDragActive
                  ? "border-slate-900 bg-slate-50"
                  : "border-slate-300 bg-white"
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

            {uploading ? (
              <div className="space-y-1">
                <div className="h-2 overflow-hidden rounded bg-slate-100">
                  <div
                    className="h-full bg-slate-900 transition-all"
                    style={{ width: `${progress}%` }}
                  />
                </div>
                <p className="text-xs text-slate-500">{progress}%</p>
              </div>
            ) : null}
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
    </div>
  );
}

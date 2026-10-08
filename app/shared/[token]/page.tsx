"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { AlertCircle, FileText, Loader2 } from "lucide-react";
import api from "@/lib/api";
import type { ApiResponse, SharedProposal } from "@/lib/types";

interface TiptapNode {
  type?: string;
  text?: string;
  content?: TiptapNode[];
}

function renderPlainText(tiptapJson: string): string {
  try {
    const doc = JSON.parse(tiptapJson) as TiptapNode;
    const lines: string[] = [];
    const walk = (node: TiptapNode) => {
      if (!node || typeof node !== "object") return;
      if (node.type === "text" && typeof node.text === "string") {
        lines.push(node.text);
      }
      if (Array.isArray(node.content)) {
        node.content.forEach(walk);
        if (node.type === "paragraph" || node.type === "heading") lines.push("\n");
      }
    };
    (doc.content ?? []).forEach(walk);
    return lines.join(" ").replace(/\s+\n/g, "\n").trim();
  } catch {
    return "";
  }
}

export default function SharedProposalPage() {
  const params = useParams<{ token: string }>();
  const [data, setData] = useState<SharedProposal | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const res = await api.get<ApiResponse<SharedProposal>>(`/api/shared/${params.token}`);
        if (res.data.success && res.data.data) {
          setData(res.data.data);
        } else {
          setError(res.data.message || "This share link is invalid.");
        }
      } catch {
        setError("This share link is invalid or has expired.");
      } finally {
        setLoading(false);
      }
    }
    void load();
  }, [params.token]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
        <div className="max-w-sm rounded-xl border bg-white p-6 text-center shadow-sm">
          <AlertCircle className="mx-auto mb-3 h-8 w-8 text-red-500" />
          <p className="text-slate-700">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="border-b bg-slate-900 px-6 py-3 text-center text-sm text-white">
        Shared by {data.sharedByName || "a teammate"} from {data.organizationName} · View only
      </div>
      <div className="mx-auto max-w-3xl px-6 py-10">
        <div className="mb-8 flex items-center gap-2">
          <FileText className="h-6 w-6 text-slate-500" />
          <h1 className="text-2xl font-semibold text-slate-900">{data.title}</h1>
        </div>
        <div className="space-y-8 rounded-xl border bg-white p-8">
          {data.sections
            .slice()
            .sort((a, b) => a.orderIndex - b.orderIndex)
            .map((s) => (
              <section key={s.id}>
                <h2 className="mb-2 text-lg font-semibold text-slate-900">{s.title}</h2>
                <p className="whitespace-pre-wrap text-slate-700">{renderPlainText(s.content)}</p>
              </section>
            ))}
        </div>
      </div>
    </div>
  );
}

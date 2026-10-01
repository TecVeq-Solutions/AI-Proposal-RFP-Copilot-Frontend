"use client";

import { useEffect, useState } from "react";
import { BubbleMenu, EditorContent, useEditor, type JSONContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Table from "@tiptap/extension-table";
import TableRow from "@tiptap/extension-table-row";
import TableCell from "@tiptap/extension-table-cell";
import TableHeader from "@tiptap/extension-table-header";
import Image from "@tiptap/extension-image";
import Placeholder from "@tiptap/extension-placeholder";
import CharacterCount from "@tiptap/extension-character-count";
import Link from "@tiptap/extension-link";
import Typography from "@tiptap/extension-typography";
import TextAlign from "@tiptap/extension-text-align";
import {
  Bold as BoldIcon,
  Italic as ItalicIcon,
  Underline as UnderlineIcon,
  Link as LinkIcon,
  Heading1,
  Heading2,
  Heading3,
  List,
  ListOrdered,
  Quote,
  Code,
  Table as TableIcon,
  Undo,
  Redo,
  Wand2,
  Loader2,
} from "lucide-react";
import { cn } from "@/lib/utils";

export interface RichTextEditorProps {
  content: string;
  onChange?: (json: JSONContent, wordCount: number) => void;
  editable?: boolean;
  placeholder?: string;
  /** Day 43: AI transforms (improve/shorter/longer/bullets/formal/summarize) on selected text. */
  onTransform?: (text: string, command: string) => Promise<string>;
}

const TRANSFORM_COMMANDS: { command: string; label: string }[] = [
  { command: "improve", label: "Improve Writing" },
  { command: "shorter", label: "Make Shorter" },
  { command: "longer", label: "Expand" },
  { command: "bullets", label: "Convert to Bullets" },
  { command: "formal", label: "Make Formal" },
  { command: "summarize", label: "Summarize" },
];

function parseContent(content: string): JSONContent {
  try {
    return JSON.parse(content) as JSONContent;
  } catch {
    return { type: "doc", content: [] };
  }
}

function ToolbarButton({
  onClick,
  active,
  disabled,
  label,
  children,
}: {
  onClick: () => void;
  active?: boolean;
  disabled?: boolean;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      disabled={disabled}
      onClick={onClick}
      className={cn(
        "flex h-8 w-8 items-center justify-center rounded text-slate-600 hover:bg-slate-100 disabled:opacity-40",
        active && "bg-slate-200 text-slate-900"
      )}
    >
      {children}
    </button>
  );
}

export function RichTextEditor({
  content,
  onChange,
  editable = true,
  placeholder = "Start writing or select text for AI commands...",
  onTransform,
}: RichTextEditorProps) {
  const [transforming, setTransforming] = useState<string | null>(null);
  const editor = useEditor({
    immediatelyRender: false,
    editable,
    extensions: [
      StarterKit,
      Table.configure({ resizable: true }),
      TableRow,
      TableCell,
      TableHeader,
      Image,
      Placeholder.configure({ placeholder }),
      CharacterCount,
      Link.configure({ openOnClick: false }),
      Typography,
      TextAlign.configure({ types: ["heading", "paragraph"] }),
    ],
    content: parseContent(content),
    editorProps: {
      attributes: {
        class: "prose prose-slate max-w-none min-h-[400px] p-6 focus:outline-none",
      },
    },
    onUpdate: ({ editor: e }) => {
      const words = e.storage.characterCount?.words?.() ?? 0;
      onChange?.(e.getJSON(), words);
    },
  });

  useEffect(() => {
    if (!editor) return;
    const current = JSON.stringify(editor.getJSON());
    const next = content;
    if (current !== next) {
      editor.commands.setContent(parseContent(next), false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [content]);

  if (!editor) return null;

  async function runTransform(command: string) {
    if (!editor || !onTransform) return;
    const { from, to, empty } = editor.state.selection;
    if (empty) return;
    const selectedText = editor.state.doc.textBetween(from, to, "\n");
    setTransforming(command);
    try {
      const result = await onTransform(selectedText, command);
      editor.chain().focus().deleteRange({ from, to }).insertContentAt(from, result).run();
    } finally {
      setTransforming(null);
    }
  }

  return (
    <div className="flex h-full flex-col">
      {editable ? (
        <div className="flex flex-wrap items-center gap-1 border-b bg-white p-2">
          <ToolbarButton
            label="Bold"
            active={editor.isActive("bold")}
            onClick={() => editor.chain().focus().toggleBold().run()}
          >
            <BoldIcon className="h-4 w-4" />
          </ToolbarButton>
          <ToolbarButton
            label="Italic"
            active={editor.isActive("italic")}
            onClick={() => editor.chain().focus().toggleItalic().run()}
          >
            <ItalicIcon className="h-4 w-4" />
          </ToolbarButton>
          <ToolbarButton
            label="Underline (Strike)"
            active={editor.isActive("strike")}
            onClick={() => editor.chain().focus().toggleStrike().run()}
          >
            <UnderlineIcon className="h-4 w-4" />
          </ToolbarButton>
          <div className="mx-1 h-5 w-px bg-slate-200" />
          <ToolbarButton
            label="Link"
            active={editor.isActive("link")}
            onClick={() => {
              const url = window.prompt("URL");
              if (url) editor.chain().focus().setLink({ href: url }).run();
            }}
          >
            <LinkIcon className="h-4 w-4" />
          </ToolbarButton>
          <div className="mx-1 h-5 w-px bg-slate-200" />
          <ToolbarButton
            label="Heading 1"
            active={editor.isActive("heading", { level: 1 })}
            onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
          >
            <Heading1 className="h-4 w-4" />
          </ToolbarButton>
          <ToolbarButton
            label="Heading 2"
            active={editor.isActive("heading", { level: 2 })}
            onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
          >
            <Heading2 className="h-4 w-4" />
          </ToolbarButton>
          <ToolbarButton
            label="Heading 3"
            active={editor.isActive("heading", { level: 3 })}
            onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
          >
            <Heading3 className="h-4 w-4" />
          </ToolbarButton>
          <div className="mx-1 h-5 w-px bg-slate-200" />
          <ToolbarButton
            label="Bullet list"
            active={editor.isActive("bulletList")}
            onClick={() => editor.chain().focus().toggleBulletList().run()}
          >
            <List className="h-4 w-4" />
          </ToolbarButton>
          <ToolbarButton
            label="Ordered list"
            active={editor.isActive("orderedList")}
            onClick={() => editor.chain().focus().toggleOrderedList().run()}
          >
            <ListOrdered className="h-4 w-4" />
          </ToolbarButton>
          <div className="mx-1 h-5 w-px bg-slate-200" />
          <ToolbarButton
            label="Quote"
            active={editor.isActive("blockquote")}
            onClick={() => editor.chain().focus().toggleBlockquote().run()}
          >
            <Quote className="h-4 w-4" />
          </ToolbarButton>
          <ToolbarButton
            label="Code block"
            active={editor.isActive("codeBlock")}
            onClick={() => editor.chain().focus().toggleCodeBlock().run()}
          >
            <Code className="h-4 w-4" />
          </ToolbarButton>
          <div className="mx-1 h-5 w-px bg-slate-200" />
          <ToolbarButton
            label="Insert table"
            onClick={() => editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()}
          >
            <TableIcon className="h-4 w-4" />
          </ToolbarButton>
          <div className="mx-1 h-5 w-px bg-slate-200" />
          <ToolbarButton label="Undo" onClick={() => editor.chain().focus().undo().run()}>
            <Undo className="h-4 w-4" />
          </ToolbarButton>
          <ToolbarButton label="Redo" onClick={() => editor.chain().focus().redo().run()}>
            <Redo className="h-4 w-4" />
          </ToolbarButton>
        </div>
      ) : null}

      {editable ? (
        <BubbleMenu editor={editor} tippyOptions={{ duration: 100 }}>
          <div className="flex items-center gap-1 rounded-lg border bg-white p-1 shadow-md">
            <ToolbarButton
              label="Bold"
              active={editor.isActive("bold")}
              onClick={() => editor.chain().focus().toggleBold().run()}
            >
              <BoldIcon className="h-4 w-4" />
            </ToolbarButton>
            <ToolbarButton
              label="Italic"
              active={editor.isActive("italic")}
              onClick={() => editor.chain().focus().toggleItalic().run()}
            >
              <ItalicIcon className="h-4 w-4" />
            </ToolbarButton>
            <ToolbarButton
              label="Heading 1"
              active={editor.isActive("heading", { level: 1 })}
              onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
            >
              <Heading1 className="h-4 w-4" />
            </ToolbarButton>
            <ToolbarButton
              label="Heading 2"
              active={editor.isActive("heading", { level: 2 })}
              onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
            >
              <Heading2 className="h-4 w-4" />
            </ToolbarButton>
            {onTransform ? (
              <>
                <div className="mx-1 h-5 w-px bg-slate-200" />
                {transforming ? (
                  <div className="flex h-8 items-center px-2 text-xs text-slate-500">
                    <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" /> {transforming}…
                  </div>
                ) : (
                  <div className="group relative">
                    <ToolbarButton label="AI commands" onClick={() => {}}>
                      <Wand2 className="h-4 w-4" />
                    </ToolbarButton>
                    <div className="invisible absolute left-0 top-full z-10 mt-1 w-40 rounded-lg border bg-white py-1 shadow-lg group-hover:visible group-focus-within:visible">
                      {TRANSFORM_COMMANDS.map((c) => (
                        <button
                          key={c.command}
                          type="button"
                          onClick={() => void runTransform(c.command)}
                          className="block w-full px-3 py-1.5 text-left text-xs text-slate-700 hover:bg-slate-50"
                        >
                          {c.label}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </>
            ) : null}
          </div>
        </BubbleMenu>
      ) : null}

      <div className="flex-1 overflow-y-auto">
        <EditorContent editor={editor} />
      </div>
    </div>
  );
}

export default RichTextEditor;

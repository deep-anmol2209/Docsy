"use client";

import { useMemo, useState } from "react";
import { StickyNote, Search, Copy, Check } from "lucide-react";
import { Streamdown } from "streamdown";
import { toast } from "sonner";

type NotesRendererProps = {
  content: string;
};

export function NotesRenderer({ content }: NotesRendererProps) {
  const [search, setSearch] = useState("");
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    if (!content) return;
    try {
      await navigator.clipboard.writeText(content);
      setCopied(true);
      toast.success("Notes copied to clipboard");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Failed to copy notes");
    }
  };

  if (!content?.trim()) {
    return (
      <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed p-8 text-center">
        <StickyNote className="size-6 text-muted-foreground" />
        <p className="mt-2 text-sm font-medium text-foreground">
          No notes available
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-4xl space-y-6">
      {/* Header Bar */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="flex size-11 shrink-0 items-center justify-center rounded-2xl border bg-amber-500/10 text-amber-600 shadow-xs dark:text-amber-400">
            <StickyNote className="size-5" />
          </div>
          <div>
            <h2 className="text-lg font-semibold tracking-tight text-foreground">
              Study Notes
            </h2>
            <p className="text-xs text-muted-foreground">
              Structured research & study points
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={handleCopy}
          className="flex items-center gap-2 rounded-xl border bg-background/80 px-3.5 py-2 text-xs font-medium text-foreground shadow-xs transition-colors hover:bg-muted"
        >
          {copied ? (
            <>
              <Check className="size-3.5 text-emerald-500" />
              <span>Copied</span>
            </>
          ) : (
            <>
              <Copy className="size-3.5 text-muted-foreground" />
              <span>Copy Notes</span>
            </>
          )}
        </button>
      </div>

      {/* Main Notes Sheet Container */}
      <div className="relative overflow-hidden rounded-2xl border border-amber-500/20 bg-amber-50/40 p-6 sm:p-8 shadow-xs dark:bg-amber-950/10">
        {/* Notebook top accent line */}
        <div className="absolute left-0 top-0 h-1.5 w-full bg-gradient-to-r from-amber-400 via-orange-400 to-amber-500" />

        <div className="prose prose-sm dark:prose-invert max-w-none text-foreground leading-relaxed">
          <Streamdown>{content}</Streamdown>
        </div>
      </div>
    </div>
  );
}

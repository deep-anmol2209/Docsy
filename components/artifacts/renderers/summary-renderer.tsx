"use client";

import { useMemo } from "react";
import { FileText, Clock, Sparkles } from "lucide-react";
import { Streamdown } from "streamdown";

type SummaryRendererProps = {
  content: string;
};

export function SummaryRenderer({ content }: SummaryRendererProps) {
  const readingTime = useMemo(() => {
    if (!content?.trim()) return 1;
    const words = content.trim().split(/\s+/).length;
    return Math.max(1, Math.ceil(words / 200));
  }, [content]);

  if (!content?.trim()) {
    return (
      <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed p-8 text-center">
        <FileText className="size-6 text-muted-foreground" />
        <p className="mt-2 text-sm font-medium text-foreground">
          No summary content available
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-4xl space-y-6">
      {/* Executive Header Banner */}
      <div className="rounded-2xl border bg-card/80 p-6 shadow-xs backdrop-blur-xs">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="flex size-11 shrink-0 items-center justify-center rounded-2xl border bg-primary/10 text-primary shadow-xs">
              <FileText className="size-5" />
            </div>
            <div>
              <h2 className="text-lg font-semibold tracking-tight text-foreground">
                Executive Summary
              </h2>
              <p className="text-xs text-muted-foreground">
                Key insights and synthesized overview
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 rounded-full border bg-muted/50 px-3 py-1 text-xs font-medium text-muted-foreground">
            <Clock className="size-3.5" />
            <span>{readingTime} min read</span>
          </div>
        </div>
      </div>

      {/* Main Content View */}
      <div className="rounded-2xl border bg-card/70 p-6 sm:p-8 shadow-xs backdrop-blur-xs">
        <div className="prose prose-sm dark:prose-invert max-w-none text-foreground leading-relaxed">
          <Streamdown>{content}</Streamdown>
        </div>
      </div>
    </div>
  );
}

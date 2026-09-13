"use client";

import { Sparkles } from "lucide-react";
import { Streamdown } from "streamdown";

type CustomArtifactRendererProps = {
  content: string;
};

export function CustomArtifactRenderer({ content }: CustomArtifactRendererProps) {
  if (!content?.trim()) {
    return (
      <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed p-8 text-center">
        <Sparkles className="size-6 text-muted-foreground" />
        <p className="mt-2 text-sm font-medium text-foreground">
          No custom artifact content available
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-4xl space-y-6">
      {/* Custom Header */}
      <div className="flex items-center gap-3.5">
        <div className="flex size-11 shrink-0 items-center justify-center rounded-2xl border bg-primary/10 text-primary shadow-xs">
          <Sparkles className="size-5" />
        </div>
        <div>
          <h2 className="text-lg font-semibold tracking-tight text-foreground">
            Custom Document
          </h2>
          <p className="text-xs text-muted-foreground">
            Tailored artifact generated from your prompt
          </p>
        </div>
      </div>

      {/* Main Document Body */}
      <div className="rounded-2xl border bg-card/70 p-6 sm:p-8 shadow-xs backdrop-blur-xs">
        <div className="prose prose-sm dark:prose-invert max-w-none text-foreground leading-relaxed">
          <Streamdown>{content}</Streamdown>
        </div>
      </div>
    </div>
  );
}

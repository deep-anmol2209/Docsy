"use client";

import { useMemo, useState } from "react";
import { BookOpen, CheckCircle2, Bookmark, Lightbulb, ListChecks } from "lucide-react";
import { Streamdown } from "streamdown";

type StudyGuideRendererProps = {
  content: string;
};

export function StudyGuideRenderer({ content }: StudyGuideRendererProps) {
  const [completedSections, setCompletedSections] = useState<Record<string, boolean>>({});

  // Parse sections based on Markdown H1 / H2 headers
  const sections = useMemo(() => {
    if (!content?.trim()) return [];

    const rawSections = content.split(/(?=\n#{1,3}\s)/);
    return rawSections
      .map((sec, idx) => {
        const trimmed = sec.trim();
        const headerMatch = trimmed.match(/^(#{1,3})\s+(.+)$/m);
        const title = headerMatch ? headerMatch[2].trim() : `Section ${idx + 1}`;
        const isKeyTakeaways = title.toLowerCase().includes("key takeaway") || title.toLowerCase().includes("summary");

        return {
          id: `sec-${idx}`,
          title,
          content: trimmed,
          isKeyTakeaways,
        };
      })
      .filter((sec) => sec.content.length > 0);
  }, [content]);

  const toggleComplete = (id: string) => {
    setCompletedSections((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const progressPercent = useMemo(() => {
    if (sections.length === 0) return 0;
    const completedCount = Object.values(completedSections).filter(Boolean).length;
    return Math.round((completedCount / sections.length) * 100);
  }, [completedSections, sections]);

  if (!content?.trim()) {
    return (
      <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed p-8 text-center">
        <BookOpen className="size-6 text-muted-foreground" />
        <p className="mt-2 text-sm font-medium text-foreground">
          No study guide content available
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-4xl space-y-6">
      {/* Header Banner */}
      <div className="rounded-2xl border bg-gradient-to-br from-primary/10 via-background to-muted/40 p-6 shadow-xs">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3.5">
            <div className="flex size-12 shrink-0 items-center justify-center rounded-2xl border bg-primary text-primary-foreground shadow-xs">
              <BookOpen className="size-6" />
            </div>
            <div>
              <h2 className="text-xl font-bold tracking-tight text-foreground">
                Study Guide
              </h2>
              <p className="text-xs text-muted-foreground">
                {sections.length} topic section{sections.length === 1 ? "" : "s"} &bull; Interactive learning checklist
              </p>
            </div>
          </div>

          {/* Progress Pill */}
          {sections.length > 1 && (
            <div className="flex items-center gap-3 rounded-xl border bg-background/80 px-4 py-2.5 shadow-xs backdrop-blur-xs">
              <ListChecks className="size-4 text-primary" />
              <div className="flex flex-col gap-1">
                <div className="flex items-center justify-between text-xs font-medium text-foreground gap-3">
                  <span>Progress</span>
                  <span>{progressPercent}%</span>
                </div>
                <div className="h-1.5 w-24 overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full bg-primary transition-all duration-300"
                    style={{ width: `${progressPercent}%` }}
                  />
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Sections List */}
      <div className="space-y-4">
        {sections.map((section) => {
          const isDone = Boolean(completedSections[section.id]);

          if (section.isKeyTakeaways) {
            return (
              <div
                key={section.id}
                className="relative overflow-hidden rounded-2xl border border-amber-500/30 bg-amber-500/5 p-6 shadow-xs dark:bg-amber-500/10"
              >
                <div className="mb-3 flex items-center gap-2 font-semibold text-amber-600 dark:text-amber-400">
                  <Lightbulb className="size-5" />
                  <span>Key Takeaways</span>
                </div>
                <div className="prose prose-sm dark:prose-invert max-w-none text-foreground leading-relaxed">
                  <Streamdown>{section.content}</Streamdown>
                </div>
              </div>
            );
          }

          return (
            <div
              key={section.id}
              className={[
                "group rounded-2xl border bg-card/80 p-6 transition-all duration-200 backdrop-blur-xs",
                isDone ? "border-emerald-500/30 bg-emerald-500/5 dark:bg-emerald-500/10" : "hover:border-primary/30",
              ].join(" ")}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 prose prose-sm dark:prose-invert max-w-none text-foreground leading-relaxed">
                  <Streamdown>{section.content}</Streamdown>
                </div>

                <button
                  type="button"
                  onClick={() => toggleComplete(section.id)}
                  title={isDone ? "Mark as unread" : "Mark section completed"}
                  className={[
                    "flex size-9 shrink-0 items-center justify-center rounded-xl border transition-all",
                    isDone
                      ? "border-emerald-500 bg-emerald-500 text-white shadow-xs"
                      : "border-border bg-background text-muted-foreground hover:border-primary/50 hover:text-primary",
                  ].join(" ")}
                >
                  <CheckCircle2 className="size-5" />
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

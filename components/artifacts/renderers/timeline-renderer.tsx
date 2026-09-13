"use client";

import { useMemo, useState } from "react";
import { Clock3, Calendar, Search, Sparkles } from "lucide-react";
import { Streamdown } from "streamdown";
import type { TimelineData, TimelineItem } from "@/types";

type TimelineRendererProps = {
  data?: TimelineData;
  content?: string;
};

function parseTimelineMarkdown(content?: string): TimelineItem[] {
  if (!content?.trim()) return [];

  const lines = content
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);

  const items: TimelineItem[] = [];
  let currentIndex = 0;

  for (const line of lines) {
    // Matches patterns like:
    // - **1999**: Event description
    // - **Phase 1** - Setup project
    // 1. **2024**: Launch
    const match = line.match(/^(?:[-*]|\d+\.)\s*(?:\*\*(.+?)\*\*|\[(.+?)\])?\s*[:-]?\s*(.+)$/);
    if (match) {
      const date = match[1] || match[2] || undefined;
      const text = match[3] || line;
      items.push({
        id: `timeline-${currentIndex++}`,
        date,
        title: date ? text : `Event ${currentIndex}`,
        description: date ? text : line.replace(/^(?:[-*]|\d+\.)\s*/, ""),
      });
    } else if (line.startsWith("#")) {
      continue;
    } else {
      items.push({
        id: `timeline-${currentIndex++}`,
        title: `Point ${currentIndex}`,
        description: line,
      });
    }
  }

  return items;
}

export function TimelineRenderer({ data, content }: TimelineRendererProps) {
  const events = useMemo<TimelineItem[]>(() => {
    if (data?.events && Array.isArray(data.events) && data.events.length > 0) {
      return data.events;
    }
    return parseTimelineMarkdown(content);
  }, [data, content]);

  const [search, setSearch] = useState("");

  const filteredEvents = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return events;
    return events.filter(
      (e) =>
        e.title.toLowerCase().includes(query) ||
        e.description.toLowerCase().includes(query) ||
        (e.date && e.date.toLowerCase().includes(query))
    );
  }, [events, search]);

  if (events.length === 0 && content) {
    return (
      <div className="prose prose-sm dark:prose-invert max-w-none rounded-2xl border bg-card p-6">
        <Streamdown>{content}</Streamdown>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-4xl space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex size-11 shrink-0 items-center justify-center rounded-2xl border bg-primary/10 text-primary shadow-xs">
            <Clock3 className="size-5" />
          </div>
          <div>
            <h2 className="text-lg font-semibold tracking-tight text-foreground">
              Timeline Overview
            </h2>
            <p className="text-xs text-muted-foreground">
              {events.length} event{events.length === 1 ? "" : "s"} in chronological sequence
            </p>
          </div>
        </div>

        {events.length > 4 && (
          <div className="relative w-full sm:w-64">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search timeline..."
              className="h-9 w-full rounded-xl border bg-background/80 pl-10 pr-4 text-xs outline-none transition-colors placeholder:text-muted-foreground focus:border-primary/50 focus:ring-2 focus:ring-primary/20"
            />
          </div>
        )}
      </div>

      {/* Timeline Stream */}
      <div className="relative pl-6 sm:pl-8">
        {/* Continuous Line */}
        <div className="absolute bottom-0 left-3 top-3 w-0.5 -translate-x-1/2 bg-gradient-to-b from-primary via-primary/50 to-border sm:left-4" />

        <div className="space-y-6">
          {filteredEvents.map((item, index) => (
            <div key={item.id || index} className="relative group">
              {/* Timeline Node Icon */}
              <div className="absolute -left-6 top-1.5 flex size-6 -translate-x-1/2 items-center justify-center rounded-full border-2 border-background bg-primary text-primary-foreground shadow-xs transition-transform group-hover:scale-110 sm:-left-8">
                <div className="size-2 rounded-full bg-background" />
              </div>

              {/* Card Container */}
              <div className="rounded-2xl border bg-card/70 p-5 shadow-xs transition-all hover:border-primary/30 hover:bg-card hover:shadow-md">
                {item.date && (
                  <div className="mb-2 flex items-center gap-1.5 text-xs font-semibold text-primary">
                    <Calendar className="size-3.5" />
                    <span>{item.date}</span>
                  </div>
                )}

                <div className="prose prose-sm dark:prose-invert max-w-none text-sm text-foreground">
                  <Streamdown>{item.description || item.title}</Streamdown>
                </div>

                {item.sourceRefs && item.sourceRefs.length > 0 && (
                  <div className="mt-3 flex items-center gap-1.5 border-t border-border/40 pt-2 text-[11px] text-muted-foreground">
                    <Sparkles className="size-3 text-primary" />
                    <span>Sources: [{item.sourceRefs.join(", ")}]</span>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {filteredEvents.length === 0 && events.length > 0 && (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed p-8 text-center">
          <Search className="size-6 text-muted-foreground" />
          <p className="mt-2 text-sm font-medium text-foreground">
            No matching events found
          </p>
        </div>
      )}
    </div>
  );
}

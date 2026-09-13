"use client";

import { useMemo, useState } from "react";
import { ChevronDown, HelpCircle, Search, Sparkles } from "lucide-react";
import { Streamdown } from "streamdown";
import type { FAQData, FAQItem } from "@/types";

type FAQRendererProps = {
  data?: FAQData;
  content?: string;
};

function parseFAQContent(content?: string): FAQItem[] {
  if (!content?.trim()) return [];

  /*
   * Expected generated markdown format:
   * **Q:** Question
   * **A:** Answer
   */
  const normalized = content
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .trim();

  const questionRegex = /\*\*Q:\*\*\s*(.+?)(?=\n\s*\*\*A:\*\*)/g;
  const matches = [...normalized.matchAll(questionRegex)];

  if (matches.length === 0) {
    return [];
  }

  return matches
    .map((match, index) => {
      const question = match[1]?.trim();
      if (!question) return null;

      const questionEnd = match.index! + match[0].length;
      const nextQuestionMatch = normalized
        .slice(questionEnd)
        .match(/\n\s*\*\*Q:\*\*/);

      const answerSection = normalized.slice(
        questionEnd,
        nextQuestionMatch
          ? questionEnd + nextQuestionMatch.index!
          : undefined,
      );

      const answer = answerSection
        .replace(/^\s*\n?\s*\*\*A:\*\*\s*/, "")
        .trim();

      if (!answer) return null;

      return {
        id: `faq-${index}`,
        question,
        answer,
      };
    })
    .filter((item): item is FAQItem => item !== null);
}

export function FAQRenderer({ data, content }: FAQRendererProps) {
  const faqs = useMemo<FAQItem[]>(() => {
    if (data?.items && Array.isArray(data.items) && data.items.length > 0) {
      return data.items;
    }
    return parseFAQContent(content);
  }, [data, content]);

  const [openId, setOpenId] = useState<string | null>(
    faqs[0]?.id ?? null,
  );

  const [search, setSearch] = useState("");

  const filteredFAQs = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return faqs;

    return faqs.filter(
      (faq) =>
        faq.question.toLowerCase().includes(query) ||
        faq.answer.toLowerCase().includes(query),
    );
  }, [faqs, search]);

  /*
   * If neither structured data nor parsed Q/A format was found,
   * fall back to standard Markdown rendering so no content is lost.
   */
  if (faqs.length === 0 && content) {
    return (
      <div className="prose prose-sm dark:prose-invert max-w-none rounded-xl border bg-card p-6">
        <Streamdown>{content}</Streamdown>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-4xl space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex size-11 shrink-0 items-center justify-center rounded-2xl border bg-primary/10 text-primary shadow-xs">
            <HelpCircle className="size-5" />
          </div>
          <div>
            <h2 className="text-lg font-semibold tracking-tight text-foreground">
              Frequently Asked Questions
            </h2>
            <p className="text-xs text-muted-foreground">
              {faqs.length} question{faqs.length === 1 ? "" : "s"} generated
            </p>
          </div>
        </div>

        {faqs.length > 0 && (
          <button
            type="button"
            onClick={() =>
              setOpenId(openId ? null : (faqs[0]?.id ?? null))
            }
            className="text-xs font-medium text-primary hover:underline"
          >
            {openId ? "Collapse All" : "Expand First"}
          </button>
        )}
      </div>

      {/* Search Bar */}
      {faqs.length > 3 && (
        <div className="relative">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search questions or answers..."
            className="h-10 w-full rounded-xl border bg-background/80 pl-10 pr-4 text-sm outline-none transition-colors placeholder:text-muted-foreground focus:border-primary/50 focus:ring-2 focus:ring-primary/20"
          />
        </div>
      )}

      {/* FAQ Accordion List */}
      <div className="overflow-hidden rounded-2xl border bg-card/60 backdrop-blur-xs">
        {filteredFAQs.map((faq, index) => {
          const isOpen = openId === faq.id;

          return (
            <div
              key={faq.id || `faq-${index}`}
              className={index !== 0 ? "border-t border-border/70" : ""}
            >
              <button
                type="button"
                onClick={() => setOpenId(isOpen ? null : faq.id)}
                aria-expanded={isOpen}
                className="group flex w-full items-center gap-4 px-5 py-4 text-left transition-colors hover:bg-muted/40 sm:px-6"
              >
                {/* Number Badge */}
                <span
                  className={[
                    "flex size-7 shrink-0 items-center justify-center rounded-lg text-xs font-semibold transition-all",
                    isOpen
                      ? "bg-primary text-primary-foreground shadow-xs"
                      : "bg-muted text-muted-foreground group-hover:bg-primary/10 group-hover:text-primary",
                  ].join(" ")}
                >
                  {index + 1}
                </span>

                {/* Question */}
                <span className="flex-1 text-sm font-medium leading-relaxed text-foreground sm:text-[15px]">
                  {faq.question}
                </span>

                {/* Chevron */}
                <ChevronDown
                  className={[
                    "size-4 shrink-0 text-muted-foreground transition-transform duration-200",
                    isOpen ? "rotate-180 text-foreground" : "",
                  ].join(" ")}
                />
              </button>

              {/* Expandable Answer */}
              {isOpen && (
                <div className="px-5 pb-5 pl-16 sm:px-6 sm:pb-6 sm:pl-[4.25rem]">
                  <div className="rounded-xl border border-border/50 bg-muted/30 px-4 py-3.5">
                    <div className="prose prose-sm dark:prose-invert max-w-none text-sm leading-relaxed text-muted-foreground">
                      <Streamdown>{faq.answer}</Streamdown>
                    </div>

                    {faq.sourceRefs && faq.sourceRefs.length > 0 && (
                      <div className="mt-3 flex items-center gap-1.5 border-t border-border/40 pt-2.5 text-[11px] text-muted-foreground">
                        <Sparkles className="size-3 text-primary" />
                        <span>Sources: [{faq.sourceRefs.join(", ")}]</span>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* No Search Results */}
      {filteredFAQs.length === 0 && faqs.length > 0 && (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed p-8 text-center">
          <Search className="size-6 text-muted-foreground" />
          <p className="mt-2 text-sm font-medium text-foreground">
            No matching questions found
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            Try adjusting your search query.
          </p>
        </div>
      )}
    </div>
  );
}
import { BrandMark } from "@/components/shared/brand-mark";

const SUGGESTIONS = [
  "Summarize the main ideas",
  "Compare the sources on this topic",
  "What are the key findings?",
];

export function ChatEmptyState({
  onSuggestionClick,
}: {
  onSuggestionClick: (text: string) => void;
}) {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-4 px-6 text-center">
      <span className="flex size-10 items-center justify-center rounded-2xl bg-primary/10 text-primary">
        <BrandMark className="size-5" />
      </span>
      <div className="space-y-1.5">
        <h2 className="text-lg font-semibold tracking-tight">Ask anything about your notebook</h2>
        <p className="max-w-sm text-sm text-muted-foreground">
          Summarize your sources, compare ideas, find important details, or generate something new.
        </p>
      </div>
      <div className="flex flex-wrap justify-center gap-2 pt-2">
        {SUGGESTIONS.map((suggestion) => (
          <button
            key={suggestion}
            type="button"
            onClick={() => onSuggestionClick(suggestion)}
            className="rounded-full border border-border/60 px-3.5 py-1.5 text-xs text-muted-foreground transition-colors hover:border-border hover:bg-muted hover:text-foreground"
          >
            {suggestion}
          </button>
        ))}
      </div>
    </div>
  );
}
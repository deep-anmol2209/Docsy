

"use client";

import { useRef } from "react";
import { ArrowUp, Square } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

export function ChatInput({
  value,
  onValueChange,
  onSend,
  onStop,
  isStreaming,
  disabled,
}: {
  value: string;
  onValueChange: (value: string) => void;
  onSend: (text: string) => void;
  onStop: () => void;
  isStreaming: boolean;
  disabled?: boolean;
}) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleSend = () => {
    if (!value.trim() || isStreaming || disabled) return;
    onSend(value);
    onValueChange("");
  };

  return (
    <div className="shrink-0 border-t border-border/60 bg-background/80 px-4 py-3 backdrop-blur-sm z-10">
      <div className="mx-auto flex max-w-3xl items-end gap-2 rounded-2xl border border-border/60 bg-card p-2 shadow-sm">
        <Textarea
          ref={textareaRef}
          value={value}
          onChange={(event) => onValueChange(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter" && !event.shiftKey) {
              event.preventDefault();
              handleSend();
            }
          }}
          placeholder="Ask anything about this notebook..."
          disabled={disabled}
          rows={1}
          className="max-h-40 min-h-9 flex-1 resize-none rounded-none border-none bg-transparent px-2 py-1.5 shadow-none focus-visible:ring-0"
        />
        {isStreaming ? (
          <Button size="icon" variant="secondary" onClick={onStop} className="shrink-0 rounded-xl">
            <Square className="size-3 fill-current" />
            <span className="sr-only">Stop generating</span>
          </Button>
        ) : (
          <Button
            size="icon"
            onClick={handleSend}
            disabled={disabled || !value.trim()}
            className="shrink-0 rounded-xl"
          >
            <ArrowUp className="size-4" />
            <span className="sr-only">Send message</span>
          </Button>
        )}
      </div>
    </div>
  );
}
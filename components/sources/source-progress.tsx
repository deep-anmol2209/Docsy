
import { Check, Circle } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { checklistStatus, jobProgressPercent, JOB_STATE_LABELS } from "@/src/utils/job-progress";
import type { JobStateValue } from "@/types";
import { cn } from "@/lib/utils";

/** Compact inline version for source cards: label + thin progress bar. */
export function SourceProgressBar({ state }: { state: JobStateValue }) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between text-xs">
        <span className="text-muted-foreground">{JOB_STATE_LABELS[state]}</span>
        <span className="tabular-nums text-muted-foreground">{jobProgressPercent(state)}%</span>
      </div>
      <Progress value={jobProgressPercent(state)} className="gap-0" />
    </div>
  );
}

/** Full checklist view (✓ / ● / ○ per stage) for the source detail/expanded view. */
export function SourceProgressChecklist({ state }: { state: JobStateValue }) {
  const items = checklistStatus(state);

  return (
    <ul className="space-y-2">
      {items.map((item) => (
        <li key={item.label} className="flex items-center gap-2.5 text-sm">
          {item.status === "done" && (
            <Check className="size-3.5 shrink-0 text-primary" />
          )}
          {item.status === "current" && (
            <span className="relative flex size-3.5 shrink-0 items-center justify-center">
              <span className="absolute size-2 animate-ping rounded-full bg-primary/60" />
              <span className="relative size-1.5 rounded-full bg-primary" />
            </span>
          )}
          {item.status === "pending" && (
            <Circle className="size-3.5 shrink-0 text-muted-foreground/40" />
          )}
          <span
            className={cn(
              item.status === "pending" ? "text-muted-foreground/60" : "text-foreground",
              item.status === "current" && "font-medium",
            )}
          >
            {item.label}
          </span>
        </li>
      ))}
    </ul>
  );
}

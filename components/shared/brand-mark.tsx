import { cn } from "@/lib/utils";

/**
 * The one signature visual element used consistently across the app: the
 * product mark (sidebar header, favicon-style spots), the empty-state
 * centerpiece, and the assistant's identity in chat. A four-point spark —
 * simple enough to read at 16px, distinct enough to not be "just another
 * lucide icon" among the interface's own iconography.
 */
export function BrandMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="currentColor"
      className={cn("size-4", className)}
      aria-hidden="true"
    >
      <path d="M12 2 L14.5 9.5 L22 12 L14.5 14.5 L12 22 L9.5 14.5 L2 12 L9.5 9.5 Z" />
    </svg>
  );
}
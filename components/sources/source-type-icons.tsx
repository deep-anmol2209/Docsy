
import { Globe, FileText, Play, Type, FileCode } from "lucide-react";
import type { SourceType } from "@/types";
import { cn } from "@/lib/utils";

const ICONS: Record<SourceType, typeof Globe> = {
  WEBSITE: Globe,
  PDF: FileText,
  YOUTUBE: Play,
  TEXT: Type,
  MARKDOWN: FileCode,
};

export function SourceTypeIcon({ type, className }: { type: SourceType; className?: string }) {
  const Icon = ICONS[type];
  return <Icon className={cn("size-4", className)} />;
}

"use client";

import {
  FileText,
  BookOpen,
  HelpCircle,
  Clock3,
  CircleHelp,
  Layers3,
  StickyNote,
  Network,
  Table2,
  Sparkles,
  type LucideIcon,
} from "lucide-react";

import type { ArtifactType } from "@/types";

export const ARTIFACT_TYPE_LABELS: Record<ArtifactType, string> = {
  SUMMARY: "Summary",
  STUDY_GUIDE: "Study Guide",
  FAQ: "FAQ",
  TIMELINE: "Timeline",
  QUIZ: "Quiz",
  FLASHCARDS: "Flashcards",
  NOTES: "Notes",
  MIND_MAP: "Mind Map",
  TABLE: "Table",
  CUSTOM: "Custom Artifact",
};

const ARTIFACT_TYPE_ICONS: Record<ArtifactType, LucideIcon> = {
  SUMMARY: FileText,
  STUDY_GUIDE: BookOpen,
  FAQ: HelpCircle,
  TIMELINE: Clock3,
  QUIZ: CircleHelp,
  FLASHCARDS: Layers3,
  NOTES: StickyNote,
  MIND_MAP: Network,
  TABLE: Table2,
  CUSTOM: Sparkles,
};

export function ArtifactTypeIcon({
  type,
  className = "size-4",
}: {
  type: ArtifactType;
  className?: string;
}) {
  const Icon = ARTIFACT_TYPE_ICONS[type] ?? FileText;

  return <Icon className={className} />;
}

"use client";

import Link from "next/link";
import { Sparkles, Loader2, XCircle } from "lucide-react";
import { Card } from "@/components/ui/card";
import { useArtifactStatus } from "@/hooks/use-artifact-status";
import type { Artifact, ChatIntent } from "@/types";

const INTENT_LABELS: Partial<Record<ChatIntent, string>> = {
  CREATE_SUMMARY: "Summary",
  CREATE_STUDY_GUIDE: "Study guide",
  CREATE_FAQ: "FAQ",
  CREATE_TIMELINE: "Timeline",
  CREATE_QUIZ: "Quiz",
  CREATE_FLASHCARDS: "Flashcards",
  CREATE_NOTES: "Notes",
  CREATE_MIND_MAP: "Mind map",
  CREATE_TABLE: "Table",
  CUSTOM_ARTIFACT: "Artifact",
};

export function ArtifactNoticeCard({
  workspaceId,
  intent,
  artifact: initialArtifact,
}: {
  workspaceId: string;
  intent: ChatIntent;
  artifact: Artifact;
}) {
  const artifact = useArtifactStatus(workspaceId, initialArtifact.id, initialArtifact);
  const label = INTENT_LABELS[intent] ?? "Artifact";

  return (
    <Card className="ml-10 flex max-w-md items-center gap-3 p-3.5">
      <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
        <Sparkles className="size-4" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">{artifact.title}</p>
        <p className="text-xs text-muted-foreground">
          {artifact.status === "GENERATING" && `Generating ${label.toLowerCase()}...`}
          {artifact.status === "READY" && "Ready"}
          {artifact.status === "FAILED" && "Generation failed"}
        </p>
      </div>
      {artifact.status === "GENERATING" && (
        <Loader2 className="size-4 shrink-0 animate-spin text-muted-foreground" />
      )}
      {artifact.status === "READY" && (
        <Link
          href={`/notebooks/${workspaceId}/artifacts/${artifact.id}`}
          className="shrink-0 text-xs font-medium text-primary hover:underline"
        >
          Open
        </Link>
      )}
      {artifact.status === "FAILED" && <XCircle className="size-4 shrink-0 text-destructive" />}
    </Card>
  );
}
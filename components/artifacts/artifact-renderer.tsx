"use client";

import type {
  Artifact,
  StructuredArtifactEnvelopeByType,
  StructuredArtifactType,
} from "@/types";

import { Streamdown } from "streamdown";

import { FlashcardsRenderer } from "@/components/artifacts/renderers/flashcard-renderer";
import { QuizRenderer } from "@/components/artifacts/renderers/quiz-renderer";
import { MindMapRenderer } from "./renderers/mind-map/mind-map-renderer"; 
import { TableRenderer } from "@/components/artifacts/renderers/table-renderer";
import { FAQRenderer } from "./renderers/faq-renderer";
import { TimelineRenderer } from "./renderers/timeline-renderer";
import { StudyGuideRenderer } from "./renderers/study-guide-renderer";
import { SummaryRenderer } from "./renderers/summary-renderer";
import { NotesRenderer } from "./renderers/notes-renderer";
import { CustomArtifactRenderer } from "./renderers/custom-renderer";

type ArtifactRendererProps = {
  artifact: Artifact;
};

function isStructuredArtifactType(
  type: Artifact["type"],
): type is StructuredArtifactType {
  return (
    type === "FLASHCARDS" ||
    type === "QUIZ" ||
    type === "MIND_MAP" ||
    type === "TABLE" ||
    type === "FAQ"
  );
}

function getStructuredArtifact(
  artifact: Artifact,
): StructuredArtifactEnvelopeByType | null {
  if (!isStructuredArtifactType(artifact.type)) {
    return null;
  }

  const artifactData = artifact.metadata?.artifactData;

  if (!artifactData || typeof artifactData !== "object") {
    return null;
  }

  if (
    !("type" in artifactData) ||
    !("data" in artifactData) ||
    artifactData.type !== artifact.type
  ) {
    return null;
  }

  return artifactData as StructuredArtifactEnvelopeByType;
}

export function ArtifactRenderer({
  artifact,
}: ArtifactRendererProps) {
  /*
   * Structured artifacts (FLASHCARDS, QUIZ, MIND_MAP, TABLE, FAQ):
   * Render from metadata.artifactData if present.
   */
  if (isStructuredArtifactType(artifact.type)) {
    const structuredArtifact = getStructuredArtifact(artifact);

    if (structuredArtifact) {
      switch (structuredArtifact.type) {
        case "FLASHCARDS":
          return <FlashcardsRenderer data={structuredArtifact.data} />;

        case "QUIZ":
          return <QuizRenderer data={structuredArtifact.data} />;

        case "MIND_MAP":
          return <MindMapRenderer data={structuredArtifact.data} />;

        case "TABLE":
          return <TableRenderer data={structuredArtifact.data} />;

        case "FAQ":
          return (
            <FAQRenderer
              data={structuredArtifact.data}
              content={artifact.content ?? undefined}
            />
          );

        default:
          break;
      }
    } else if (artifact.type === "FAQ") {
      // Fallback for markdown-based FAQ artifacts
      return <FAQRenderer content={artifact.content ?? ""} />;
    }
  }

  /*
   * Dedicated UI renderers for non-structured / prose artifacts:
   * SUMMARY
   * STUDY_GUIDE
   * TIMELINE
   * NOTES
   * CUSTOM
   */
  switch (artifact.type) {
    case "SUMMARY":
      return <SummaryRenderer content={artifact.content ?? ""} />;

    case "STUDY_GUIDE":
      return <StudyGuideRenderer content={artifact.content ?? ""} />;

    case "TIMELINE":
      return <TimelineRenderer content={artifact.content ?? ""} />;

    case "NOTES":
      return <NotesRenderer content={artifact.content ?? ""} />;

    case "CUSTOM":
      return <CustomArtifactRenderer content={artifact.content ?? ""} />;

    default:
      return (
        <div className="prose prose-sm dark:prose-invert max-w-none">
          <Streamdown>{artifact.content ?? ""}</Streamdown>
        </div>
      );
  }
}

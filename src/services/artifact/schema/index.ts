
/**
 * Structured artifact envelope + per-type schema registry.
 *
 * Only artifact types whose content is naturally *data-shaped* get a
 * structured schema here — FLASHCARDS, QUIZ, MIND_MAP, TABLE. The
 * remaining types (SUMMARY, STUDY_GUIDE, FAQ, TIMELINE, NOTES, CUSTOM)
 * are genuinely prose/document-shaped and continue to use the existing
 * Markdown generation path unchanged — forcing them into rigid structured
 * data would hurt quality for no rendering benefit. This can be revisited
 * per-type later; nothing about this registry prevents it.
 */

import { z } from "zod";
import { ArtifactType } from "@/lib/generated/prisma/enums";
import { flashcardsDataSchema, type FlashcardsData } from "./flash-card-schema";
import { quizDataSchema, type QuizData } from "./quiz-schema";
import { mindMapDataSchema, type MindMapData } from "./mindmap-schema";
import { tableDataSchema, type TableData } from "./table-schema";
import { faqDataSchema, type FAQData } from "./faq-schema";

export * from "./flash-card-schema";
export * from "./quiz-schema";
export * from "./mindmap-schema";
export * from "./table-schema";
export * from "./faq-schema";

export const CURRENT_SCHEMA_VERSION = 1;

export const STRUCTURED_ARTIFACT_TYPES = [
  ArtifactType.FLASHCARDS,
  ArtifactType.QUIZ,
  ArtifactType.MIND_MAP,
  ArtifactType.TABLE,
  ArtifactType.FAQ,
] as const;

export type StructuredArtifactType = (typeof STRUCTURED_ARTIFACT_TYPES)[number];

export function isStructuredArtifactType(type: ArtifactType): type is StructuredArtifactType {
  return (STRUCTURED_ARTIFACT_TYPES as readonly ArtifactType[]).includes(type);
}

/** Maps each structured type to its `data` shape — the single source of truth for `StructuredArtifactEnvelope`'s data field. */
export type StructuredDataByType = {
  [ArtifactType.FLASHCARDS]: FlashcardsData;
  [ArtifactType.QUIZ]: QuizData;
  [ArtifactType.MIND_MAP]: MindMapData;
  [ArtifactType.TABLE]: TableData;
  [ArtifactType.FAQ]: FAQData;
};

const DATA_SCHEMAS: { [K in StructuredArtifactType]: z.ZodType<StructuredDataByType[K]> } = {
  [ArtifactType.FLASHCARDS]: flashcardsDataSchema,
  [ArtifactType.QUIZ]: quizDataSchema,
  [ArtifactType.MIND_MAP]: mindMapDataSchema,
  [ArtifactType.TABLE]: tableDataSchema,
  [ArtifactType.FAQ]: faqDataSchema,
};

export type StructuredArtifactEnvelope<T extends StructuredArtifactType = StructuredArtifactType> = {
  schemaVersion: number;
  type: T;
  title: string;
  data: StructuredDataByType[T];
};

/** Full envelope schema for a given structured type — validates `{schemaVersion, type, title, data}` as one unit. */
export function envelopeSchemaFor<T extends StructuredArtifactType>(type: T) {
  return z.object({
    schemaVersion: z.literal(CURRENT_SCHEMA_VERSION),
    type: z.literal(type),
    title: z.string().trim().min(1),
    data: DATA_SCHEMAS[type],
  });
}

/** Validates an unknown parsed JSON value against the envelope for `type`. Never throws — callers decide how to handle failure. */
export function parseStructuredArtifact(
  type: StructuredArtifactType,
  value: unknown,
):
  | {
      success: true;
      data: AnyStructuredArtifactEnvelope;
    }
  | {
      success: false;
      error: z.ZodError;
    } {
  const result = envelopeSchemaFor(type).safeParse(value);

  if (!result.success) {
    return {
      success: false,
      error: result.error,
    };
  }

  return {
    success: true,
    data: result.data as AnyStructuredArtifactEnvelope,
  };
}

export type AnyStructuredArtifactEnvelope = {
  [T in StructuredArtifactType]: StructuredArtifactEnvelope<T>
}[StructuredArtifactType];
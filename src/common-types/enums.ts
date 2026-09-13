/**
 * enums.ts
 *
 * Central enumeration of stable, system-level vocabularies used across the ingestion
 * pipeline.
 *
 * IMPORTANT: `SourceType` is intentionally NOT a closed TypeScript enum. New source
 * types (DOCX, PPTX, Notion, GitHub, Google Docs, Audio, EPUB, ...) are added by
 * registering a new `SourceTypeDefinition` in `sources/definitions/` - never by
 * editing this file. Keeping it an open string type is what makes that possible;
 * `KNOWN_SOURCE_TYPES` below only documents the types that ship out of the box.
 */

/** Open string type - the live set of valid values is owned by the Source Type Registry. */
export type SourceType = string;

/** Source types that ship with the initial release. Not exhaustive - see the registry for the live list. */
export const KNOWN_SOURCE_TYPES = {
  PDF: 'PDF',
  YOUTUBE: 'YOUTUBE',
  TEXT: 'TEXT',
  MARKDOWN: 'MARKDOWN',
  WEBPAGE: 'WEBSITE',
} as const;

/** How a source's raw content is supplied to the system. */
export enum SourceInputKind {
  FILE = 'file',
  URL = 'url',
  RAW_TEXT = 'raw_text',
}

/** Classification produced by the Document Analyzer. */
export enum DocumentType {
  RESEARCH_PAPER = 'RESEARCH_PAPER',
  PRESENTATION = 'PRESENTATION',
  NOTES = 'NOTES',
  INVOICE = 'INVOICE',
  TRANSCRIPT = 'TRANSCRIPT',
  BOOK = 'BOOK',
  STRUCTURED = 'STRUCTURED',
  UNSTRUCTURED = 'UNSTRUCTURED',
  UNKNOWN = 'UNKNOWN',
}

/** Structural unit types inside the Common Document Model. */
export enum BlockType {
  PARAGRAPH = 'PARAGRAPH',
  HEADING = 'HEADING',
  LIST_ITEM = 'LIST_ITEM',
  TABLE = 'TABLE',
  IMAGE_REFERENCE = 'IMAGE_REFERENCE',
  CODE_BLOCK = 'CODE_BLOCK',
  QUOTE = 'QUOTE',
  SLIDE = 'SLIDE',
  TRANSCRIPT_SEGMENT = 'TRANSCRIPT_SEGMENT',
}

/** Registered chunking strategies. New strategies are added here plus one entry in the Chunk Strategy Registry. */
export enum ChunkStrategyName {
  PARAGRAPH = 'PARAGRAPH',
  HEADING = 'HEADING',
  MARKDOWN_HEADING = 'MARKDOWN_HEADING',
  SEMANTIC = 'SEMANTIC',
  RECURSIVE = 'RECURSIVE',
  TRANSCRIPT = 'TRANSCRIPT',
  PAGE = 'PAGE',
  SLIDE = 'SLIDE',
  RESEARCH_PAPER = 'RESEARCH_PAPER',
}

/** Ingestion job lifecycle states. Mirrors the pipeline stages 1:1 for observability. */
export enum JobState {
  QUEUED = 'QUEUED',
  VALIDATING = 'VALIDATING',
  PARSING = 'PARSING',
  OCR = 'OCR',
  NORMALIZING = 'NORMALIZING',
  ANALYZING = 'ANALYZING',
  CONVERTING_MARKDOWN = 'CONVERTING_MARKDOWN',
  SELECTING_STRATEGY = 'SELECTING_STRATEGY',
  CHUNKING = 'chunking',
  ENRICHING = 'ENRICHING',
  EMBEDDING = 'EMBEDDING',
  WRITING_TO_VECTOR_STORE = 'WRITING_TO_VECTOR_STORE',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
}

/** Terminal states a Job can reach; no further transitions are legal from these. */
export const TERMINAL_JOB_STATES: ReadonlySet<JobState> = new Set([
  JobState.COMPLETED,
  JobState.FAILED,
]);
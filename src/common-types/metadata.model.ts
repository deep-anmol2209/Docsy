import { DocumentType, JobState } from './enums';

/**
 * metadata.model.ts
 *
 * Three-tier metadata model: Source, Document, Chunk. Each tier is owned by a
 * different stage of the pipeline and stored at a different granularity - keeping
 * them distinct (rather than one flattened blob per chunk) is what makes source-level
 * and document-level queries ("all sources by X", "re-process only document Y") cheap
 * and precise instead of requiring a scan-and-filter over every chunk.
 */

/**
 * One record per user-added knowledge source. Written at creation time and updated as
 * ingestion progresses (`ingestionStatus` mirrors the owning Job's current state).
 */
export interface SourceMetadata {
  readonly sourceId: string;
  readonly sourceType: string;
  readonly title: string;
  readonly author?: string;

  /** ISO-8601 timestamps. */
  readonly createdAt: string;
  readonly updatedAt: string;

  /** Original reference to the content: a URL, an object-storage key, or omitted for raw-text input. */
  readonly originalReference?: string;

  readonly language?: string;

  readonly ownerUserId: string;
  readonly workspaceId: string;

  /** Denormalized copy of the owning Job's state, kept here for fast source-list rendering
   *  without joining against the Jobs table on every read. */
  readonly ingestionStatus: JobState;
}

/**
 * One record per parsed document. Usually 1:1 with a Source today, but a single Source
 * (e.g. a future GitHub repository or Notion workspace source) may later produce
 * multiple Documents without any change to this shape.
 */
export interface DocumentMetadata {
  readonly documentId: string;
  readonly sourceId: string;

  readonly documentType: DocumentType;

  readonly isScanned: boolean;
  readonly requiresOCR: boolean;

  /** Confidence, in the range [0, 1], the Analyzer has in `documentType` and the structural flags. */
  readonly structureConfidence: number;

  readonly parserName: string;
  readonly parserVersion: string;
  readonly analyzerVersion: string;

  readonly pageCount?: number;
  readonly durationSeconds?: number;
  readonly wordCount?: number;
}

/**
 * One record per chunk. This is the highest-cardinality table in the system (millions
 * of rows at scale) - keep this shape lean and avoid adding large or rarely-queried
 * fields directly here.
 */
export interface ChunkMetadata {
  readonly chunkId: string;
  readonly documentId: string;

  readonly order: number;
  readonly chunkStrategy: string;

  readonly page?: number;
  readonly heading?: string;
  readonly section?: string;
  readonly startTimeSeconds?: number;
  readonly endTimeSeconds?: number;
  readonly slideNumber?: number;

  readonly embeddingModel?: string;
  readonly embeddingVersion?: string;
  readonly tokenCount?: number;

  readonly enrichmentFlags?: Readonly<Record<string, boolean>>;
}
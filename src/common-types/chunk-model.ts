import { ChunkStrategyName } from './enums';

/**
 * chunk-model.ts
 *
 * The retrievable unit produced by the Chunking stage and, eventually, embedded and
 * written to the vector store. This file owns chunk identity and content; the
 * descriptive, high-cardinality metadata attached to a chunk (page, heading, timestamps,
 * embedding model version) is also modeled here as `ChunkPosition`/`ChunkEmbeddingInfo`
 * so a `Chunk` is a complete, storable record on its own.
 */

/** One original SRT/transcript cue: its own text plus its own start/end timestamps,
 *  independent of whatever chunk it ends up grouped into. */
export interface TranscriptLine {
  readonly text: string;
  readonly startTimeSeconds: number;
  readonly endTimeSeconds: number;
}

/** Structural position of a chunk within its parent document. Fields are format-dependent and optional. */
export interface ChunkPosition {
  readonly page?: number;
  readonly heading?: string;
  readonly section?: string;
  readonly startTimeSeconds?: number;
  readonly endTimeSeconds?: number;
  readonly slideNumber?: number;
  /** Inclusive [start, end] range of source `DocumentBlock.order` values this chunk was built from. */
  readonly blockOrderRange?: readonly [start: number, end: number];

  /**
   * For transcript chunks only: every original line (SRT cue) grouped into this
   * chunk, each with its own start/end timestamp. `startTimeSeconds`/`endTimeSeconds`
   * above describe the *chunk's* overall span (first line's start to last line's
   * end) - that's enough to locate the right neighborhood via semantic search, but
   * not enough to jump to the exact moment a specific sentence was said, since a
   * chunk can span 30-60 seconds of dialogue. This array is what a second-stage,
   * within-chunk re-rank (e.g. a cross-encoder scoring the query against each line)
   * needs in order to return the *specific line's* timestamp instead of the chunk's
   * start time.
   */
  readonly transcriptLines?: readonly TranscriptLine[];
}

/**
 * Embedding attached to a chunk. `vector` is intentionally optional here - the vector
 * itself typically lives in the vector store, not duplicated in the relational Chunk
 * record; this shape lets callers carry it transiently through the pipeline without
 * forcing every consumer of `Chunk` to hold a full embedding in memory.
 */
export interface ChunkEmbeddingInfo {
  readonly model: string;
  readonly modelVersion: string;
  readonly dimensions: number;
  readonly vector?: readonly number[];
}

export interface Chunk {
  readonly id: string;
  readonly documentId: string;
  readonly sourceId: string;

  /** Zero-based sequence position among sibling chunks of the same document. */
  readonly order: number;

  readonly content: string;

  readonly strategy: ChunkStrategyName;

  readonly position: ChunkPosition;
readonly transcriptLine?: TranscriptLine | null;
  readonly tokenCount?: number;

  readonly embedding?: ChunkEmbeddingInfo;

  /** Free-form boolean flags set by enrichers (e.g. containsTable, containsCode, containsPII). */
  readonly enrichmentFlags?: Readonly<Record<string, boolean>>;
}

/**
 * Shape produced by a `ChunkStrategy` before an ID is assigned and before embedding /
 * enrichment have run. Keeping this as a distinct type (rather than an all-optional
 * `Chunk`) makes the pipeline's stage boundaries explicit: a chunking strategy cannot
 * accidentally set `embedding`, because the type doesn't allow it.
 */
export type DraftChunk = Omit<Chunk, 'id' | 'embedding' | 'enrichmentFlags'>;
import type { Chunk } from '../../common-types/chunk-model';
import type { ChunkMetadata } from '../../common-types/metadata.model';

export interface ChunkEnrichmentOptions {
  readonly language?: string;
  readonly embeddingModel?: string;
  readonly embeddingVersion?: string;
}

/**
 * Chunk Metadata Enricher
 *
 * Responsibility:
 * ----------------
 * Build lean ChunkMetadata records ready for Vector DB indexing.
 */
export class ChunkMetadataEnricher {
  public enrich(chunk: Chunk, options?: ChunkEnrichmentOptions): ChunkMetadata {
    return {
      chunkId: chunk.id,
      documentId: chunk.documentId,
      order: chunk.order,
      chunkStrategy: chunk.strategy,
      page: chunk.position.page,
      heading: chunk.position.heading,
      section: chunk.position.section,
      startTimeSeconds: chunk.position.startTimeSeconds,
      endTimeSeconds: chunk.position.endTimeSeconds,
      slideNumber: chunk.position.slideNumber,
      embeddingModel: options?.embeddingModel ?? chunk.embedding?.model,
      embeddingVersion: options?.embeddingVersion ?? chunk.embedding?.modelVersion,
      tokenCount: chunk.tokenCount,
      enrichmentFlags: chunk.enrichmentFlags,
    };
  }
}
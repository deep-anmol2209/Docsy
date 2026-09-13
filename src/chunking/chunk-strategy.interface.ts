import type { CommonDocument } from '../common-types/document-model';
import type { DraftChunk } from '../common-types/chunk-model';
import type { ChunkStrategyName } from '../common-types/enums';

/**
 * chunk-strategy.interface.ts
 *
 * The contract every chunking strategy implements. `ChunkingStage` depends only on
 * this interface (resolved through the Chunk Strategy Registry) - it never imports a
 * concrete strategy class directly, so adding a new strategy never requires a
 * `ChunkingStage` change.
 */
export interface IChunkStrategy {
  readonly name: ChunkStrategyName;

  /**
   * Produces draft chunks from a document. `markdownContent`, when supplied, is the
   * document's already-rendered Markdown form (native Markdown sources, or a research
   * paper converted to Markdown upstream) - strategies that benefit from Markdown's
   * own structural splitting (heading levels, etc.) use it when present and fall back
   * to block-based splitting otherwise.
   */
  chunk(document: CommonDocument, markdownContent?: string): Promise<DraftChunk[]>;
}
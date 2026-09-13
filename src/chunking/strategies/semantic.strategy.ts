import { RecursiveCharacterTextSplitter } from '@langchain/textsplitters';
import { ChunkStrategyName } from '../../common-types/enums';
import type { CommonDocument } from '../../common-types/document-model';
import type { DraftChunk } from '../../common-types/chunk-model';
import type { IChunkStrategy } from '../chunk-strategy.interface';
import { concatenateBlocks, locateSplitOffsets, resolvePosition, toDraftChunk, tokensToChars } from '../chunk-text-utils';

/**
 * semantic.strategy.ts
 *
 * Best for: dense prose and books, where topical coherence matters more than any
 * physical structure (pages, headings) the source happens to have.
 *
 * This is a best-effort semantic split: it uses `RecursiveCharacterTextSplitter` with
 * sentence-level separators prioritized ahead of generic whitespace, so boundaries
 * land on sentence ends rather than mid-sentence, without requiring an actual sentence
 * embedding model or a similarity-boundary computation.
 */

const CHUNK_SIZE_TOKENS = 600;
const CHUNK_OVERLAP_TOKENS = 120;
const SEPARATORS = ['\n\n', '\n', '. ', '? ', '! ', ' ', ''];

export class SemanticChunkStrategy implements IChunkStrategy {
  public readonly name = ChunkStrategyName.SEMANTIC;

  private readonly splitter = new RecursiveCharacterTextSplitter({
    chunkSize: tokensToChars(CHUNK_SIZE_TOKENS),
    chunkOverlap: tokensToChars(CHUNK_OVERLAP_TOKENS),
    separators: SEPARATORS,
  });

  public async chunk(document: CommonDocument): Promise<DraftChunk[]> {
    const { text, spans } = concatenateBlocks(document.blocks);
    if (text.trim().length === 0) {
      return [];
    }

    const splits = await this.splitter.splitText(text);
    const offsets = locateSplitOffsets(text, splits);

    return splits.map((content, index) =>
      toDraftChunk({
        document,
        strategy: this.name,
        order: index,
        content,
        position: resolvePosition(spans, offsets[index]),
      }),
    );
  }
}

export const semanticChunkStrategy = new SemanticChunkStrategy();
import { RecursiveCharacterTextSplitter } from '@langchain/textsplitters';
import { ChunkStrategyName } from '../../common-types/enums';
import type { CommonDocument } from '../../common-types/document-model';
import type { DraftChunk } from '../../common-types/chunk-model';
import type { IChunkStrategy } from '../chunk-strategy.interface';
import { concatenateBlocks, locateSplitOffsets, resolvePosition, toDraftChunk, tokensToChars } from '../chunk-text-utils';

/**
 * recursive.strategy.ts
 *
 * Best for: long, unstructured prose with no reliable heading, page, or paragraph
 * signal to key off - the fallback strategy of last resort when nothing else about
 * the document's structure is known.
 *
 * Uses `RecursiveCharacterTextSplitter` with its default separator cascade and a
 * tighter chunk size than `paragraph`, trading some coherence for guaranteed,
 * predictably-sized chunks on content that gives no better structural signal to key off.
 */

const CHUNK_SIZE_TOKENS = 512;
const CHUNK_OVERLAP_TOKENS = 64;

export class RecursiveChunkStrategy implements IChunkStrategy {
  public readonly name = ChunkStrategyName.RECURSIVE;

  private readonly splitter = new RecursiveCharacterTextSplitter({
    chunkSize: tokensToChars(CHUNK_SIZE_TOKENS),
    chunkOverlap: tokensToChars(CHUNK_OVERLAP_TOKENS),
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

export const recursiveChunkStrategy = new RecursiveChunkStrategy();
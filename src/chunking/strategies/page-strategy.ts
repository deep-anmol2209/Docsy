import { RecursiveCharacterTextSplitter } from '@langchain/textsplitters';
import { ChunkStrategyName } from '../../common-types/enums';
import type { CommonDocument } from '../../common-types/document-model';
import type { DraftChunk } from '../../common-types/chunk-model';
import type { IChunkStrategy } from '../chunk-strategy.interface';
import {
  concatenateBlocks,
  groupBlocksByPage,
  locateSplitOffsets,
  resolvePosition,
  toDraftChunk,
  tokensToChars,
} from '../chunk-text-utils';

/**
 * page.strategy.ts
 *
 * Best for: scanned or searchable PDFs (and other paginated formats) without a
 * reliable heading hierarchy to key off - keeping physical page boundaries meaningful
 * matters for citation ("see page 12") even when the content itself has no headings.
 *
 * Groups all blocks by page number first, then splits any page whose content exceeds
 * the chunk size with `RecursiveCharacterTextSplitter`. Every page produces at least
 * one chunk, even a short one, so page-level citation never loses a page entirely.
 */

const CHUNK_SIZE_TOKENS = 800;
const CHUNK_OVERLAP_TOKENS = 100;

export class PageChunkStrategy implements IChunkStrategy {
  public readonly name = ChunkStrategyName.PAGE;

  private readonly splitter = new RecursiveCharacterTextSplitter({
    chunkSize: tokensToChars(CHUNK_SIZE_TOKENS),
    chunkOverlap: tokensToChars(CHUNK_OVERLAP_TOKENS),
  });

  public async chunk(document: CommonDocument): Promise<DraftChunk[]> {
    const pages = groupBlocksByPage(document.blocks);
    const draftChunks: DraftChunk[] = [];
    let order = 0;

    for (const page of pages) {
      const { text, spans } = concatenateBlocks(page.blocks);
      if (text.trim().length === 0) {
        continue;
      }

      const splits = await this.splitter.splitText(text);
      const offsets = locateSplitOffsets(text, splits);

      for (let i = 0; i < splits.length; i += 1) {
        draftChunks.push(
          toDraftChunk({
            document,
            strategy: this.name,
            order: order++,
            content: splits[i],
            position: { ...resolvePosition(spans, offsets[i]), page: page.pageNumber },
          }),
        );
      }
    }

    return draftChunks;
  }
}

export const pageChunkStrategy = new PageChunkStrategy();
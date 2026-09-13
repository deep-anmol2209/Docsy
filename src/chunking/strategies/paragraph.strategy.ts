import { RecursiveCharacterTextSplitter } from '@langchain/textsplitters';
import { ChunkStrategyName } from '../../common-types/enums';
import type { CommonDocument } from '../../common-types/document-model';
import type { DraftChunk } from '../../common-types/chunk-model';
import type { IChunkStrategy } from '../chunk-strategy.interface';
import { concatenateBlocks, locateSplitOffsets, resolvePosition, toDraftChunk, tokensToChars } from '../chunk-text-utils';

/**
 * paragraph.strategy.ts
 *
 * Best for: plain text and notes - content without strong headings but with natural
 * paragraph breaks the author already intended.
 *
 * Flattens the document's blocks into one text blob and splits on paragraph-first
 * separators via `RecursiveCharacterTextSplitter`, so a paragraph boundary is only
 * crossed when a single paragraph exceeds the chunk size on its own.
 */

const CHUNK_SIZE_TOKENS = 800;
const CHUNK_OVERLAP_TOKENS = 100;
const SEPARATORS = ['\n\n', '\n', '. ', ' ', ''];

export class ParagraphChunkStrategy implements IChunkStrategy {
  public readonly name = ChunkStrategyName.PARAGRAPH;

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

export const paragraphChunkStrategy = new ParagraphChunkStrategy();
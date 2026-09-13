import { RecursiveCharacterTextSplitter } from '@langchain/textsplitters';
import { ChunkStrategyName } from '../../common-types/enums';
import type { CommonDocument } from '../../common-types/document-model';
import type { DraftChunk } from '../../common-types/chunk-model';
import type { IChunkStrategy } from '../chunk-strategy.interface';
import {
  concatenateBlocks,
  groupBlocksBySlide,
  locateSplitOffsets,
  resolvePosition,
  toDraftChunk,
  tokensToChars,
} from '../chunk-text-utils';

/**
 * slide.strategy.ts
 *
 * Best for: presentation-derived content (PPTX, and any future slide-based source).
 *
 * Groups blocks by slide number - each slide normally becomes exactly one chunk,
 * matching how users mentally reference "slide 7" - and only splits a slide into
 * multiple chunks via `RecursiveCharacterTextSplitter` when its combined content
 * (main text plus speaker notes) is unusually long for a single slide.
 *
 * Chunk size defaults are deliberately generous relative to `page`/`paragraph`: most
 * individual slides are short, so the size budget mainly exists as a safety valve for
 * the rare slide with a large embedded table or dense notes.
 */

const CHUNK_SIZE_TOKENS = 1500;
const CHUNK_OVERLAP_TOKENS = 150;

export class SlideChunkStrategy implements IChunkStrategy {
  public readonly name = ChunkStrategyName.SLIDE;

  private readonly splitter = new RecursiveCharacterTextSplitter({
    chunkSize: tokensToChars(CHUNK_SIZE_TOKENS),
    chunkOverlap: tokensToChars(CHUNK_OVERLAP_TOKENS),
  });

  public async chunk(document: CommonDocument): Promise<DraftChunk[]> {
    const slides = groupBlocksBySlide(document.blocks);
    const draftChunks: DraftChunk[] = [];
    let order = 0;

    for (const slide of slides) {
      const { text, spans } = concatenateBlocks(slide.blocks);
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
            position: { ...resolvePosition(spans, offsets[i]), slideNumber: slide.slideNumber },
          }),
        );
      }
    }

    return draftChunks;
  }
}

export const slideChunkStrategy = new SlideChunkStrategy();
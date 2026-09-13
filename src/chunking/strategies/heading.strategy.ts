import { RecursiveCharacterTextSplitter } from '@langchain/textsplitters';
import { ChunkStrategyName } from '../../common-types/enums';
import type { CommonDocument } from '../../common-types/document-model';
import type { DraftChunk } from '../../common-types/chunk-model';
import type { IChunkStrategy } from '../chunk-strategy.interface';
import {
  concatenateBlocks,
  groupBlocksByHeading,
  locateSplitOffsets,
  resolvePosition,
  toDraftChunk,
  tokensToChars,
} from '../chunk-text-utils';

/**
 * heading.strategy.ts
 *
 * Best for: webpages and other structured documents where headings come from the
 * document's own block structure (`BlockType.HEADING`), not from Markdown syntax. See
 * `markdown-heading.strategy.ts` for the Markdown-native equivalent, which uses
 * `MarkdownTextSplitter`'s header-aware splitting on a raw Markdown string instead of
 * document blocks.
 *
 * Groups content under each heading into its own section, then splits any section
 * that exceeds the chunk size with `RecursiveCharacterTextSplitter`, so a heading
 * boundary is only crossed when a single section is too long to fit in one chunk.
 */

const CHUNK_SIZE_TOKENS = 800;
const CHUNK_OVERLAP_TOKENS = 100;

export class HeadingChunkStrategy implements IChunkStrategy {
  public readonly name = ChunkStrategyName.HEADING;

  private readonly splitter = new RecursiveCharacterTextSplitter({
    chunkSize: tokensToChars(CHUNK_SIZE_TOKENS),
    chunkOverlap: tokensToChars(CHUNK_OVERLAP_TOKENS),
  });

  public async chunk(document: CommonDocument): Promise<DraftChunk[]> {
    const sections = groupBlocksByHeading(document.blocks);
    const draftChunks: DraftChunk[] = [];
    let order = 0;

    for (const section of sections) {
      const { text, spans } = concatenateBlocks(section.blocks);
      if (text.trim().length === 0) {
        continue;
      }

      const splits = await this.splitter.splitText(text);
      const offsets = locateSplitOffsets(text, splits);

      for (let i = 0; i < splits.length; i += 1) {
        const position = resolvePosition(spans, offsets[i]);
        draftChunks.push(
          toDraftChunk({
            document,
            strategy: this.name,
            order: order++,
            content: splits[i],
            position: { ...position, heading: position.heading ?? section.heading },
          }),
        );
      }
    }

    return draftChunks;
  }
}

export const headingChunkStrategy = new HeadingChunkStrategy();
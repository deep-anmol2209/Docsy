import { MarkdownTextSplitter, RecursiveCharacterTextSplitter } from '@langchain/textsplitters';
import { ChunkStrategyName } from '../../common-types/enums';
import type { CommonDocument } from '../../common-types/document-model';
import type { DraftChunk } from '../../common-types/chunk-model';
import type { IChunkStrategy } from '../chunk-strategy.interface';
import {
  concatenateBlocks,
  extractLeadingMarkdownHeading,
  groupBlocksByParentId,
  locateSplitOffsets,
  resolvePosition,
  toDraftChunk,
  tokensToChars,
} from '../chunk-text-utils';

/**
 * research-paper.strategy.ts
 *
 * Best for: academic papers - content with a strong Abstract/Methods/Results/
 * Discussion-style section structure, where keeping a full section together (up to a
 * generous size budget) preserves far more retrieval value than a fixed-size window
 * that might split "Methods" from its own final paragraph.
 *
 * When `markdownContent` is supplied (research papers are often converted to
 * Markdown upstream), splits it directly with `MarkdownTextSplitter`. Otherwise,
 * groups blocks by their owning section via the `parentId` relationship in the
 * document model - not simple document-order proximity - so a table or paragraph
 * stays grouped with its actual section heading, then splits any over-long section
 * with `RecursiveCharacterTextSplitter`.
 */

const CHUNK_SIZE_TOKENS = 1200;
const CHUNK_OVERLAP_TOKENS = 150;

export class ResearchPaperChunkStrategy implements IChunkStrategy {
  public readonly name = ChunkStrategyName.RESEARCH_PAPER;

  private readonly markdownSplitter = new MarkdownTextSplitter({
    chunkSize: tokensToChars(CHUNK_SIZE_TOKENS),
    chunkOverlap: tokensToChars(CHUNK_OVERLAP_TOKENS),
  });

  private readonly sectionSplitter = new RecursiveCharacterTextSplitter({
    chunkSize: tokensToChars(CHUNK_SIZE_TOKENS),
    chunkOverlap: tokensToChars(CHUNK_OVERLAP_TOKENS),
  });

  public async chunk(document: CommonDocument, markdownContent?: string): Promise<DraftChunk[]> {
    if (markdownContent && markdownContent.trim().length > 0) {
      return this.chunkFromMarkdown(document, markdownContent);
    }
    return this.chunkFromSections(document);
  }

  private async chunkFromMarkdown(
    document: CommonDocument,
    markdownContent: string,
  ): Promise<DraftChunk[]> {
    const splits = await this.markdownSplitter.splitText(markdownContent);

    return splits.map((content, index) =>
      toDraftChunk({
        document,
        strategy: this.name,
        order: index,
        content,
        position: { heading: extractLeadingMarkdownHeading(content) },
      }),
    );
  }

  private async chunkFromSections(document: CommonDocument): Promise<DraftChunk[]> {
    const sections = groupBlocksByParentId(document.blocks);
    const draftChunks: DraftChunk[] = [];
    let order = 0;

    for (const section of sections) {
      const { text, spans } = concatenateBlocks(section.blocks);
      if (text.trim().length === 0) {
        continue;
      }

      const splits = await this.sectionSplitter.splitText(text);
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

export const researchPaperChunkStrategy = new ResearchPaperChunkStrategy();
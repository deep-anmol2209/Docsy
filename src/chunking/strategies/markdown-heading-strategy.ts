import { MarkdownTextSplitter, RecursiveCharacterTextSplitter } from '@langchain/textsplitters';
import { ChunkStrategyName } from '../../common-types/enums';
import type { CommonDocument } from '../../common-types/document-model';
import type { DraftChunk } from '../../common-types/chunk-model';
import type { IChunkStrategy } from '../chunk-strategy.interface';
import {
  concatenateBlocks,
  extractLeadingMarkdownHeading,
  locateSplitOffsets,
  resolvePosition,
  toDraftChunk,
  tokensToChars,
} from '../chunk-text-utils';

/**
 * markdown-heading.strategy.ts
 *
 * Best for: native Markdown sources, and any document a prior stage has rendered to
 * Markdown (e.g. a research paper conversion) - anywhere heading hierarchy is
 * expressed as `#`/`##`/... syntax rather than as document-model `HEADING` blocks.
 *
 * Uses `MarkdownTextSplitter` directly on the raw Markdown string when
 * `markdownContent` is supplied, which understands heading levels natively and keeps
 * a section's content together up to the chunk size. Falls back to
 * `RecursiveCharacterTextSplitter` over the document's blocks when no Markdown string
 * is available, so this strategy still produces reasonable output for a Markdown
 * source whose content somehow reached this stage as plain blocks only.
 */

const CHUNK_SIZE_TOKENS = 1000;
const CHUNK_OVERLAP_TOKENS = 100;

export class MarkdownHeadingChunkStrategy implements IChunkStrategy {
  public readonly name = ChunkStrategyName.MARKDOWN_HEADING;

  private readonly markdownSplitter = new MarkdownTextSplitter({
    chunkSize: tokensToChars(CHUNK_SIZE_TOKENS),
    chunkOverlap: tokensToChars(CHUNK_OVERLAP_TOKENS),
  });

  private readonly fallbackSplitter = new RecursiveCharacterTextSplitter({
    chunkSize: tokensToChars(CHUNK_SIZE_TOKENS),
    chunkOverlap: tokensToChars(CHUNK_OVERLAP_TOKENS),
  });

  public async chunk(document: CommonDocument, markdownContent?: string): Promise<DraftChunk[]> {
    if (markdownContent && markdownContent.trim().length > 0) {
      return this.chunkFromMarkdown(document, markdownContent);
    }
    return this.chunkFromBlocks(document);
  }

  private async chunkFromMarkdown(
    document: CommonDocument,
    markdownContent: string,
  ): Promise<DraftChunk[]> {
    const splits = await this.markdownSplitter.splitText(markdownContent);

    // Splits here come from the raw Markdown string, not `document.blocks`, so there
    // are no block spans to map back to via `resolvePosition` - the best available
    // position signal is each split's own leading heading line, when it has one.
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

  private async chunkFromBlocks(document: CommonDocument): Promise<DraftChunk[]> {
    const { text, spans } = concatenateBlocks(document.blocks);
    if (text.trim().length === 0) {
      return [];
    }

    const splits = await this.fallbackSplitter.splitText(text);
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

export const markdownHeadingChunkStrategy = new MarkdownHeadingChunkStrategy();
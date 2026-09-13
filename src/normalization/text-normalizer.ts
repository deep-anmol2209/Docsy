import type { CommonDocument, DocumentBlock } from '../common-types/document-model';
import type { Normalizer } from './normalizer.interface';

/**
 * Text Normalizer
 *
 * Responsibility:
 * ----------------
 * Apply general text normalization rules across document blocks.
 */
export class TextNormalizer implements Normalizer {
  public normalize(document: CommonDocument): CommonDocument {
    const updatedBlocks = document.blocks.map((block) => this.normalizeTextBlock(block));
    return {
      ...document,
      blocks: updatedBlocks,
    };
  }

  private normalizeTextBlock(block: DocumentBlock): DocumentBlock {
    let text = block.content;
    if (!text) {
      return block;
    }

    // 1. Normalize line endings to LF (\n)
    text = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n');

    // 2. Normalize smart/curly quotes to straight quotes
    text = text.replace(/[\u201C\u201D\u201E\u201F\u2033\u2036]/g, '"');
    text = text.replace(/[\u2018\u2019\u201A\u201B\u2032\u2035]/g, "'");

    // 3. Normalize em-dashes and en-dashes to standard hyphen (-)
    text = text.replace(/[\u2013\u2014\u2015]/g, '-');

    // 4. Normalize repetitive punctuation (e.g., !!! -> !, ??? -> ?)
    text = text.replace(/!{2,}/g, '!');
    text = text.replace(/\?{2,}/g, '?');

    return {
      ...block,
      content: text,
    };
  }
}
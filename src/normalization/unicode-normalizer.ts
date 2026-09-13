import type { CommonDocument, DocumentBlock } from '../common-types/document-model';
import type { Normalizer } from './normalizer.interface';

/**
 * Unicode Normalizer
 *
 * Responsibility:
 * ----------------
 * Normalize Unicode characters into a consistent form.
 *
 * Purpose:
 * --------
 * Ensure different Unicode representations become identical.
 */
export class UnicodeNormalizer implements Normalizer {
  /**
   * Normalizes unicode character encoding and special characters for a CommonDocument.
   */
  public normalize(document: CommonDocument): CommonDocument {
    const updatedBlocks = document.blocks.map((block) => this.normalizeBlock(block));
    return {
      ...document,
      blocks: updatedBlocks,
    };
  }

  private normalizeBlock(block: DocumentBlock): DocumentBlock {
    let text = block.content;

    if (!text) {
      return block;
    }

    // 1. Normalize Unicode composition (NFC)
    text = text.normalize('NFC');

    // 2. Replace non-breaking spaces with standard space
    text = text.replace(/\u00A0/g, ' ');

    // 3. Remove zero-width spaces and zero-width non-joiners
    text = text.replace(/[\u200B-\u200D\uFEFF]/g, '');

    // 4. Strip replacement character \uFFFD and invalid control characters (keep \n and \t)
    text = text.replace(/[\uFFFD\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F-\u009F]/g, '');

    return {
      ...block,
      content: text,
    };
  }
}
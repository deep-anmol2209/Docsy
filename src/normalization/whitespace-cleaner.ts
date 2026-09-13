import { BlockType } from '../common-types/enums';
import type { CommonDocument, DocumentBlock } from '../common-types/document-model';
import type { Normalizer } from './normalizer.interface';

/**
 * Whitespace Cleaner
 *
 * Responsibility:
 * ----------------
 * Remove unnecessary whitespace while preserving document structure.
 */
export class WhitespaceCleaner implements Normalizer {
  public normalize(document: CommonDocument): CommonDocument {
    const updatedBlocks = document.blocks.map((block) => this.cleanBlock(block));
    return {
      ...document,
      blocks: updatedBlocks,
    };
  }

  private cleanBlock(block: DocumentBlock): DocumentBlock {
    // Preserve formatting strictly for code blocks
    if (block.type === BlockType.CODE_BLOCK) {
      return block;
    }

    let text = block.content;
    if (!text) {
      return block;
    }

    // 1. Remove duplicate horizontal spaces/tabs on each line
    text = text
      .split('\n')
      .map((line) => line.replace(/[ \t]+/g, ' ').trim())
      .join('\n');

    // 2. Collapse 3 or more consecutive blank lines down to 2
    text = text.replace(/\n{3,}/g, '\n\n');

    // 3. Trim leading and trailing whitespace of the block content
    text = text.trim();

    return {
      ...block,
      content: text,
    };
  }
}
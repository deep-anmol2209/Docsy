import { BlockType } from '../../common-types/enums';
import type { CommonDocument } from '../../common-types/document-model';
import type { StructureClassification } from '../analysis-result-model';

export interface StructureDetectionOutput {
  readonly structureType: StructureClassification;
  readonly headingCount: number;
  readonly tableCount: number;
  readonly listCount: number;
  readonly codeBlockCount: number;
}

/**
 * Structure Detector
 *
 * Responsibility:
 * ----------------
 * Analyze document structural elements (headings, tables, lists, code blocks) to classify organization.
 */
export class StructureDetector {
  public detect(document: CommonDocument): StructureDetectionOutput {
    let headingCount = 0;
    let tableCount = 0;
    let listCount = 0;
    let codeBlockCount = 0;

    for (const block of document.blocks || []) {
      switch (block.type) {
        case BlockType.HEADING:
          headingCount++;
          break;
        case BlockType.TABLE:
          tableCount++;
          break;
        case BlockType.LIST_ITEM:
          listCount++;
          break;
        case BlockType.CODE_BLOCK:
          codeBlockCount++;
          break;
      }
    }

    let structureType: StructureClassification;

    if (headingCount >= 2 || tableCount >= 1 || codeBlockCount >= 1) {
      structureType = 'structured';
    } else if (listCount >= 3 || headingCount === 1) {
      structureType = 'semi_structured';
    } else {
      structureType = 'unstructured';
    }

    return {
      structureType,
      headingCount,
      tableCount,
      listCount,
      codeBlockCount,
    };
  }
}
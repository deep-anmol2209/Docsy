import { BlockType, DocumentType } from '../../common-types/enums';
import type { CommonDocument } from '../../common-types/document-model';
import type { StructureDetectionOutput } from './structure.detector';
import type { DocumentTypeDetectionOutput } from './document-type.detector';
import type { ScanDetectionOutput } from './scanned-vs-searchable.detector';

export interface FormatRecommendationOutput {
  readonly recommendedIntermediateFormat: 'text' | 'markdown';
  readonly reasoning: readonly string[];
}

/**
 * Format Recommendation Detector
 *
 * Responsibility:
 * ----------------
 * Determine whether a parsed PDF or document should continue as plain text
 * or first be converted into Markdown prior to chunking.
 *
 * Enforces rule: DO NOT convert every PDF. Only recommend Markdown when the
 * document structure benefits from Markdown formatting.
 */
export class FormatRecommendationDetector {
  public detect(
    document: CommonDocument,
    structureInfo: StructureDetectionOutput,
    typeInfo: DocumentTypeDetectionOutput,
    scanInfo: ScanDetectionOutput
  ): FormatRecommendationOutput {
    const reasoning: string[] = [];

    // 1. Check OCR / scanned document signal
    if (scanInfo.isScanned || scanInfo.requiresOCR) {
      reasoning.push('Detected scanned document / OCR output where structure reconstruction is beneficial');
    }

    // 2. Check heading hierarchy / nested sections
    if (structureInfo.headingCount > 0) {
      const headingLevels = new Set(
        document.blocks
          .filter((b) => b.type === BlockType.HEADING && b.headingLevel)
          .map((b) => b.headingLevel)
      );
      if (headingLevels.size > 1) {
        reasoning.push(
          `Detected heading hierarchy with ${headingLevels.size} levels (${structureInfo.headingCount} headings total)`
        );
      } else {
        reasoning.push(`Detected ${structureInfo.headingCount} structural heading(s)`);
      }
    }

    // 3. Check tables
    if (structureInfo.tableCount > 0) {
      reasoning.push(`Detected ${structureInfo.tableCount} table(s) needing Markdown grid structure`);
    }

    // 4. Check lists (bullet / numbered)
    if (structureInfo.listCount > 0) {
      reasoning.push(`Detected ${structureInfo.listCount} list item(s)`);
    }

    // 5. Check code blocks
    if (structureInfo.codeBlockCount > 0) {
      reasoning.push(`Detected ${structureInfo.codeBlockCount} code block(s)`);
    }

    // 6. Check presentation slides
    if (
      typeInfo.documentType === DocumentType.PRESENTATION ||
      document.blocks.some((b) => b.type === BlockType.SLIDE || typeof b.slideNumber === 'number')
    ) {
      reasoning.push('Detected presentation slides requiring slide-level Markdown formatting');
    }

    // 7. Check document type signals (research papers, reports, technical manuals)
    if (typeInfo.documentType === DocumentType.RESEARCH_PAPER) {
      reasoning.push('Detected multi-section research paper / technical manual format');
    }

    // 8. Check for chapters in text
    const hasChapterKeyword = document.blocks.some(
      (b) => b.type === BlockType.HEADING && /chapter\s+\d+/i.test(b.content)
    );
    if (hasChapterKeyword) {
      reasoning.push('Detected document with structured chapter headings');
    }

    // Decision rule:
    if (reasoning.length > 0) {
      return {
        recommendedIntermediateFormat: 'markdown',
        reasoning,
      };
    }

    return {
      recommendedIntermediateFormat: 'text',
      reasoning: [
        'Single-column / continuous text without headings, tables, or complex formatting',
        'Proceeding with plain-text chunking flow',
      ],
    };
  }
}

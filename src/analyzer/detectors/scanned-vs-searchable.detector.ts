import type { CommonDocument } from '../../common-types/document-model';

export interface ScanDetectionOutput {
  readonly isScanned: boolean;
  readonly requiresOCR: boolean;
  readonly confidence: number;
}

/**
 * Scan Detector
 *
 * Responsibility:
 * ----------------
 * Determine whether OCR is required by inspecting CommonDocument blocks.
 */
export class ScannedVsSearchableDetector {
  public detect(document: CommonDocument): ScanDetectionOutput {
    if (!document.blocks || document.blocks.length === 0) {
      return {
        isScanned: true,
        requiresOCR: true,
        confidence: 0.8,
      };
    }

    const totalBlocks = document.blocks.length;
    let emptyOrSparseCount = 0;
    let totalCharCount = 0;

    for (const block of document.blocks) {
      const content = block.content ? block.content.trim() : '';
      totalCharCount += content.length;
      if (content.length < 15) {
        emptyOrSparseCount++;
      }
    }

    const avgCharsPerBlock = totalCharCount / totalBlocks;
    const sparseRatio = emptyOrSparseCount / totalBlocks;

    if (sparseRatio > 0.7 || avgCharsPerBlock < 10) {
      return {
        isScanned: true,
        requiresOCR: true,
        confidence: 0.9,
      };
    }

    if (sparseRatio > 0.3) {
      return {
        isScanned: false,
        requiresOCR: true, // mixed content
        confidence: 0.8,
      };
    }

    return {
      isScanned: false,
      requiresOCR: false,
      confidence: 0.95,
    };
  }
}
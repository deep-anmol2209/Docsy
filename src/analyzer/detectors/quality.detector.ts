import type { CommonDocument } from '../../common-types/document-model';

export interface QualityDetectionOutput {
  readonly qualityScore: number; // [0..1]
  readonly garbledTextDetected: boolean;
  readonly encodingIssuesDetected: boolean;
  readonly missingContentDetected: boolean;
}

/**
 * Quality Detector
 *
 * Responsibility:
 * ----------------
 * Evaluate extracted text quality and flag potential extraction anomalies.
 */
export class QualityDetector {
  public detect(document: CommonDocument): QualityDetectionOutput {
    if (!document.blocks || document.blocks.length === 0) {
      return {
        qualityScore: 0.0,
        garbledTextDetected: true,
        encodingIssuesDetected: false,
        missingContentDetected: true,
      };
    }

    let totalChars = 0;
    let replacementCharCount = 0;
    let nonAsciiUnprintableCount = 0;

    for (const block of document.blocks) {
      const text = block.content || '';
      totalChars += text.length;

      for (let i = 0; i < text.length; i++) {
        const charCode = text.charCodeAt(i);
        if (text[i] === '\uFFFD') {
          replacementCharCount++;
        } else if (charCode < 32 && charCode !== 9 && charCode !== 10 && charCode !== 13) {
          nonAsciiUnprintableCount++;
        }
      }
    }

    if (totalChars === 0) {
      return {
        qualityScore: 0.1,
        garbledTextDetected: true,
        encodingIssuesDetected: false,
        missingContentDetected: true,
      };
    }

    const replacementRatio = replacementCharCount / totalChars;
    const unprintableRatio = nonAsciiUnprintableCount / totalChars;

    const encodingIssuesDetected = replacementRatio > 0.01;
    const garbledTextDetected = unprintableRatio > 0.02 || replacementRatio > 0.05;
    const missingContentDetected = totalChars < 50;

    let qualityScore = 1.0;
    qualityScore -= replacementRatio * 5;
    qualityScore -= unprintableRatio * 5;
    if (missingContentDetected) qualityScore -= 0.3;

    qualityScore = Math.max(0.0, Math.min(1.0, qualityScore));

    return {
      qualityScore,
      garbledTextDetected,
      encodingIssuesDetected,
      missingContentDetected,
    };
  }
}
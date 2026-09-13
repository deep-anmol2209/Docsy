import { DocumentType, BlockType } from '../../common-types/enums';
import type { CommonDocument } from '../../common-types/document-model';

export interface DocumentTypeDetectionOutput {
  readonly documentType: DocumentType;
  readonly confidence: number;
}

/**
 * Document Type Detector
 *
 * Responsibility:
 * ----------------
 * Identify document type based on structural block signals and content patterns.
 */
export class DocumentTypeDetector {
  public detect(document: CommonDocument): DocumentTypeDetectionOutput {
    if (!document.blocks || document.blocks.length === 0) {
      return { documentType: DocumentType.UNKNOWN, confidence: 0.2 };
    }

    // Signal 1: YouTube / Transcript
    if (document.sourceType === 'youtube' || document.blocks.some((b) => b.type === BlockType.TRANSCRIPT_SEGMENT)) {
      return { documentType: DocumentType.TRANSCRIPT, confidence: 0.95 };
    }

    // Signal 2: Slide presentation
    if (document.blocks.some((b) => b.type === BlockType.SLIDE || typeof b.slideNumber === 'number')) {
      return { documentType: DocumentType.PRESENTATION, confidence: 0.95 };
    }

    const textContent = document.blocks.map((b) => b.content).join('\n');
    const lowerText = textContent.toLowerCase();

    // Signal 3: Research Paper
    if (
      (lowerText.includes('abstract') && lowerText.includes('references')) ||
      lowerText.includes('doi:') ||
      lowerText.includes('arxiv:') ||
      (lowerText.includes('introduction') && lowerText.includes('conclusion') && lowerText.includes('method'))
    ) {
      return { documentType: DocumentType.RESEARCH_PAPER, confidence: 0.9 };
    }

    // Signal 4: Invoice / Receipt
    if (
      (lowerText.includes('invoice') || lowerText.includes('bill to') || lowerText.includes('subtotal')) &&
      (lowerText.includes('total') || lowerText.includes('amount due') || lowerText.includes('tax'))
    ) {
      return { documentType: DocumentType.INVOICE, confidence: 0.85 };
    }

    // Signal 5: Structured documentation / Notes / Book
    const hasHeadings = document.blocks.some((b) => b.type === BlockType.HEADING);
    const hasTables = document.blocks.some((b) => b.type === BlockType.TABLE);

    if (hasHeadings && (hasTables || document.blocks.length > 50)) {
      return { documentType: DocumentType.BOOK, confidence: 0.75 };
    }

    if (hasHeadings) {
      return { documentType: DocumentType.STRUCTURED, confidence: 0.7 };
    }

    return { documentType: DocumentType.UNSTRUCTURED, confidence: 0.6 };
  }
}
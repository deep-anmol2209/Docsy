export type PdfScanClassification = 'searchable' | 'scanned' | 'mixed';

export interface PdfScanDetectionResult {
  readonly classification: PdfScanClassification;
  readonly requiresOCR: boolean;
  readonly confidence: number;
  readonly totalPages: number;
  readonly emptyOrImagePageCount: number;
  readonly averageCharsPerPage: number;
}

export function detectPdfScan(pageTexts: readonly string[]): PdfScanDetectionResult {
  const totalPages = pageTexts.length;

  if (totalPages === 0) {
    return {
      classification: 'scanned',
      requiresOCR: true,
      confidence: 0.5,
      totalPages: 0,
      emptyOrImagePageCount: 0,
      averageCharsPerPage: 0,
    };
  }

  let emptyOrImagePageCount = 0;
  let totalChars = 0;

  for (const pageText of pageTexts) {
    const cleanText = pageText.trim();
    totalChars += cleanText.length;

    if (cleanText.length < 30) {
      emptyOrImagePageCount++;
    }
  }

  const averageCharsPerPage = totalChars / totalPages;
  const scannedRatio = emptyOrImagePageCount / totalPages;

  let classification: PdfScanClassification;
  let requiresOCR: boolean;
  let confidence: number;

  if (scannedRatio >= 0.8 || averageCharsPerPage < 20) {
    classification = 'scanned';
    requiresOCR = true;
    confidence = Math.min(1.0, 0.7 + scannedRatio * 0.3);
  } else if (scannedRatio > 0.15) {
    classification = 'mixed';
    requiresOCR = true;
    confidence = 0.85;
  } else {
    classification = 'searchable';
    requiresOCR = false;
    confidence = Math.min(1.0, 0.7 + (1 - scannedRatio) * 0.3);
  }

  return {
    classification,
    requiresOCR,
    confidence,
    totalPages,
    emptyOrImagePageCount,
    averageCharsPerPage,
  };
}

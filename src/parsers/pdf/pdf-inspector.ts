import { extractPdfTextWithScribe } from './scribe-pdf-extractor';


export interface PdfPageClassification {
  readonly pageNumber: number;
  readonly isScanned: boolean;
  readonly charCount: number;
}

export interface PdfClassificationResult {
  readonly totalPages: number;
  readonly textBasedPages: readonly number[];
  readonly scannedImagePages: readonly number[];
  readonly pageDetails: readonly PdfPageClassification[];
}

export async function inspectPdfPages(buffer: Buffer): Promise<{ pageNumber: number; text: string; totalPages: number }[]> {
  const pages = await extractPdfTextWithScribe(buffer, { ocrPages: 'none' });
  const totalPages = pages.length;
  return pages.map((page) => ({ ...page, totalPages }));
}

export async function inspectPdfBuffer(pdfBuffer: Buffer): Promise<PdfClassificationResult> {
  const pageOutputs = await inspectPdfPages(pdfBuffer);
  const totalPages = pageOutputs.length;

  const pageDetails: PdfPageClassification[] = [];
  const textBasedPages: number[] = [];
  const scannedImagePages: number[] = [];

  for (const page of pageOutputs) {
    const pageNum = page.pageNumber;
    const cleanText = page.text.trim();
    const charCount = cleanText.length;
    const isScanned = charCount < 30;

    pageDetails.push({
      pageNumber: pageNum,
      isScanned,
      charCount,
    });

    if (isScanned) {
      scannedImagePages.push(pageNum);
    } else {
      textBasedPages.push(pageNum);
    }
  }

  console.log(`[PDF INSPECTOR] 📊 Inspection Summary (${totalPages} total pages):`);
  console.log(`  - Text-based pages (${textBasedPages.length}): [${textBasedPages.join(', ')}]`);
  console.log(`  - Scanned image pages (${scannedImagePages.length}): [${scannedImagePages.join(', ')}]`);

  return {
    totalPages,
    textBasedPages,
    scannedImagePages,
    pageDetails,
  };
}

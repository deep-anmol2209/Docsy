import PDFParser from 'pdf2json';

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

function safeDecodeURI(str: string): string {
  if (!str) return '';
  try {
    return decodeURIComponent(str);
  } catch {
    try {
      return decodeURIComponent(str.replace(/%(?![0-9A-Fa-f]{2})/g, '%25'));
    } catch {
      return str;
    }
  }
}

interface Pdf2JsonTextRun {
  readonly T?: string;
}

interface Pdf2JsonTextItem {
  readonly x: number;
  readonly y: number;
  readonly w?: number;
  readonly R?: readonly Pdf2JsonTextRun[];
}

interface Pdf2JsonPage {
  readonly Texts?: readonly Pdf2JsonTextItem[];
}

interface Pdf2JsonDocument {
  readonly Pages?: readonly Pdf2JsonPage[];
}

export async function inspectPdfPages(buffer: Buffer): Promise<{ pageNumber: number; text: string; totalPages: number }[]> {
  return new Promise((resolve, reject) => {
    const pdfParser = new PDFParser(null, true);

    pdfParser.on('pdfParser_dataError', (errData: Error | { parserError: Error | string }) => {
      const msg = errData instanceof Error ? errData.message : String(errData?.parserError || 'PDF inspection error');
      reject(new Error(msg));
    });

    pdfParser.on('pdfParser_dataReady', (pdfData: Pdf2JsonDocument) => {
      try {
        const pages: { pageNumber: number; text: string; totalPages: number }[] = [];
        const totalPages = pdfData?.Pages?.length || 0;

        if (pdfData && pdfData.Pages) {
          pdfData.Pages.forEach((page, pageIdx) => {
            if (!page.Texts || page.Texts.length === 0) {
              pages.push({ pageNumber: pageIdx + 1, text: '', totalPages });
              return;
            }

            let pageContent = '';
            for (const item of page.Texts) {
              const str = (item.R || []).map((r) => safeDecodeURI(r.T || '')).join('');
              if (str.trim()) {
                pageContent += str + ' ';
              }
            }

            pages.push({
              pageNumber: pageIdx + 1,
              text: pageContent.trim(),
              totalPages,
            });
          });
        }

        resolve(pages);
      } catch (err) {
        reject(err);
      }
    });

    pdfParser.parseBuffer(buffer);
  });
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

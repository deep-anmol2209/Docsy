import scribe from 'scribe.js-ocr';

export interface ScribePdfPage {
  readonly pageNumber: number;
  readonly text: string;
}

type ScribePdfOptions = {
  readonly ocrPages: 'none' | 'all';
};

export async function extractPdfTextWithScribe(
  buffer: Buffer,
  options: ScribePdfOptions = { ocrPages: 'all' },
): Promise<ScribePdfPage[]> {
  const arrayBuffer = new Uint8Array(buffer).buffer;
  const text = await scribe.extractText(
    { pdfFiles: [arrayBuffer] },
    ['eng'],
    'txt',
    options,
  );

  return String(text)
    .split('\f')
    .map((pageText, index) => ({
      pageNumber: index + 1,
      text: pageText.trim(),
    }));
}
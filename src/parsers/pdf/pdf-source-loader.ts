import PDFParser from 'pdf2json';
import type { DocumentBlock } from '../../common-types/document-model';
import type { ParseRequest } from '../parser-interface';
import { extractPdfWithUnstructured, isUnstructuredAvailable } from './unstructured-pdf-extractor';
import { SupabaseStorageAdapter } from '../../storage/adapters/supabase.adapter';
import type { UnstructuredExtractionResult } from './unstructured-pdf-extractor';

export interface PdfPageText {
  readonly pageNumber: number;
  readonly text: string;
}

export type PdfExtractionMethod = 'unstructured' | 'pdf2json';

export interface PdfLoadResult {
  readonly extractionMethod: PdfExtractionMethod;
  readonly blocks?: readonly DocumentBlock[];
  readonly pages?: readonly PdfPageText[];
}

export interface PdfPageClassification {
  readonly scannedImagePages: readonly number[];
  readonly textBasedPages: readonly number[];
}

export interface PdfStorageAdapter {
  download(objectKey: string): Promise<Buffer>;
}

export interface PdfUnstructuredExtractor {
  isAvailable(): boolean;
  extractFromBuffer(buffer: Buffer, fileName: string): Promise<UnstructuredExtractionResult>;
}

export interface PdfLoaderOptions {
  readonly unstructuredExtractor?: PdfUnstructuredExtractor;
  readonly storageAdapter?: PdfStorageAdapter;
}

const SUPABASE_REFERENCE_PATTERN = /^supabase:\/\/[^/]+\//;
const CLOUDINARY_REFERENCE_PATTERN = /^cloudinary:\/\/(.+)$/i;

export async function loadPdfFromRequest(
  request: ParseRequest,
  options: PdfLoaderOptions = {},
): Promise<PdfLoadResult> {
  const fileName = determineFileName(request);
  const pageClassification = request.processingMetadata?.pdfClassification as PdfPageClassification | undefined;
  const storageAdapter = options.storageAdapter ?? new SupabaseStorageAdapter();

  if (
    request.cloudinarySecureUrl ||
    request.cloudinaryPublicId ||
    isCloudinaryReference(request.storageLocation)
  ) {
    const buffer = await downloadPdfFromCloudinary(request);
    return loadPdfFromBuffer(buffer, fileName, pageClassification, options);
  }

  if (!request.storageLocation) {
    throw new Error(`PdfLoader: ParseRequest for source "${request.sourceId}" has no storageLocation.`);
  }

  const objectKey = request.storageLocation.replace(SUPABASE_REFERENCE_PATTERN, '');
  const buffer = await storageAdapter.download(objectKey);
  return loadPdfFromBuffer(buffer, fileName, pageClassification, options);
}

export async function loadPdfFromBuffer(
  buffer: Buffer,
  fileName: string,
  pageClassification?: PdfPageClassification,
  options: PdfLoaderOptions = {},
): Promise<PdfLoadResult> {
  const unstructuredExtractor =
    options.unstructuredExtractor ?? {
      isAvailable: isUnstructuredAvailable,
      extractFromBuffer: extractPdfWithUnstructured,
    };

  if (shouldSkipUnstructured(pageClassification)) {
    return loadWithPdf2json(buffer);
  }

  if (unstructuredExtractor.isAvailable()) {
    const unstructuredBlocks = await tryLoadWithUnstructured(buffer, fileName, unstructuredExtractor);
    if (unstructuredBlocks && unstructuredBlocks.length > 0) {
      return { extractionMethod: 'unstructured', blocks: unstructuredBlocks };
    }
  }

  return loadWithPdf2json(buffer);
}

function shouldSkipUnstructured(pageClassification?: PdfPageClassification): boolean {
  if (!pageClassification) return false;
  return (
    pageClassification.textBasedPages.length === 0 &&
    pageClassification.scannedImagePages.length > 0
  );
}

async function tryLoadWithUnstructured(
  buffer: Buffer,
  fileName: string,
  extractor: PdfUnstructuredExtractor,
): Promise<readonly DocumentBlock[] | undefined> {
  try {
    const result = await extractor.extractFromBuffer(buffer, fileName);
    return result.blocks;
  } catch {
    return undefined;
  }
}

function loadWithPdf2json(buffer: Buffer): Promise<PdfLoadResult> {
  console.log("loadWithPdf2json");
  return extractTextFromPdfBuffer(buffer).then((pages) => ({ extractionMethod: 'pdf2json', pages }));
}

function determineFileName(request: ParseRequest): string {
  if (request.cloudinarySecureUrl) {
    try {
      const url = new URL(request.cloudinarySecureUrl);
      const candidate = url.pathname.split('/').pop();
      if (candidate) return candidate;
    } catch {
      // fallback to other options
    }
  }

  if (request.storageLocation && isCloudinaryReference(request.storageLocation)) {
    const publicId = getCloudinaryPublicIdFromReference(request.storageLocation);
    return publicId.includes('.') ? publicId.split('/').pop() ?? `${request.sourceId}.pdf` : `${publicId}.pdf`;
  }

  if (request.cloudinaryPublicId) {
    return request.cloudinaryPublicId.includes('.')
      ? request.cloudinaryPublicId.split('/').pop() ?? `${request.sourceId}.pdf`
      : `${request.cloudinaryPublicId}.pdf`;
  }

  if (request.storageLocation) {
    const objectKey = request.storageLocation.replace(SUPABASE_REFERENCE_PATTERN, '');
    return objectKey.split('/').pop() || `${request.sourceId}.pdf`;
  }

  return `${request.sourceId}.pdf`;
}

function isCloudinaryReference(value?: string): boolean {
  return typeof value === 'string' && CLOUDINARY_REFERENCE_PATTERN.test(value);
}

function getCloudinaryPublicIdFromReference(reference: string): string {
  const match = CLOUDINARY_REFERENCE_PATTERN.exec(reference);
  return match?.[1] ?? reference;
}

async function downloadPdfFromCloudinary(request: ParseRequest): Promise<Buffer> {
  const cloudinaryPublicId = request.cloudinaryPublicId ??
    (request.storageLocation && isCloudinaryReference(request.storageLocation)
      ? getCloudinaryPublicIdFromReference(request.storageLocation)
      : undefined);
  const secureUrl = request.cloudinarySecureUrl ?? getCloudinaryUrlFromPublicId(cloudinaryPublicId);

  if (!secureUrl) {
    throw new Error('PdfLoader: Cloudinary URL or public ID is required when requesting a Cloudinary PDF.');
  }

  const response = await fetch(secureUrl);
  if (!response.ok) {
    throw new Error(`Failed to download PDF from Cloudinary: ${response.status} ${response.statusText}`);
  }

  const arrayBuffer = await response.arrayBuffer();
  return Buffer.from(arrayBuffer);
}

function getCloudinaryUrlFromPublicId(publicId?: string): string | undefined {
  if (!publicId) {
    return undefined;
  }

  const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
  if (!cloudName) {
    throw new Error('Cloudinary cloud name is required when downloading by publicId. Set CLOUDINARY_CLOUD_NAME.');
  }

  const id = publicId.includes('.') ? publicId : `${publicId}.pdf`;
  return `https://res.cloudinary.com/${encodeURIComponent(cloudName)}/raw/upload/${encodeURIComponent(id)}`;
}

function extractTextFromPdfBuffer(buffer: Buffer): Promise<PdfPageText[]> {
  console.log("extracting text from pdfbuffer");
  
  return new Promise((resolve, reject) => {
    const pdfParser = new PDFParser(null, true);

    pdfParser.on('pdfParser_dataError', (errData: Error | { parserError?: unknown }) => {
      const message =
        errData instanceof Error
          ? errData.message
          : String(errData?.parserError ?? 'PDF parsing error');
      reject(new Error(message));
    });

    pdfParser.on('pdfParser_dataReady', (pdfData: Pdf2JsonDocument) => {
      try {
        resolve(reconstructPages(pdfData));
      } catch (err) {
        reject(err instanceof Error ? err : new Error('Failed to reconstruct PDF text.'));
      }
    });

    pdfParser.parseBuffer(buffer);
  });
}

function reconstructPages(pdfData: Pdf2JsonDocument): PdfPageText[] {
  const pages: PdfPageText[] = [];

  if (!pdfData?.Pages) {
    return pages;
  }

  pdfData.Pages.forEach((page, pageIndex) => {
    const text = reconstructPageText(page);
    if (text.length > 0) {
      pages.push({ pageNumber: pageIndex + 1, text });
    }
  });
console.log("pages: ", pages);

  return pages;
}

function reconstructPageText(page: Pdf2JsonPage): string {
  if (!page.Texts || page.Texts.length === 0) {
    return '';
  }

  const sortedTexts = [...page.Texts].sort((a, b) =>
    Math.abs(a.y - b.y) < 0.2 ? a.x - b.x : a.y - b.y,
  );

  let content = '';
  let lastY: number | null = null;
  let lastX: number | null = null;
  let lastWidth = 0;

  for (const item of sortedTexts) {
    const text = (item.R ?? []).map((run) => safeDecodeURIComponent(run.T ?? '')).join('');
    if (!text.trim()) {
      continue;
    }

    if (lastY !== null) {
      const deltaY = item.y - lastY;
      if (deltaY > 0.3) {
        content += deltaY > 0.8 ? '\n\n' : '\n';
      } else if (lastX !== null) {
        const expectedNextX = lastX + lastWidth;
        const gap = item.x - expectedNextX;
        if (gap > 0.35 || item.x - lastX > 0.8) {
          content += ' ';
        }
      }
    }

    content += text;
    lastY = item.y;
    lastX = item.x;
    lastWidth = item.w ?? text.length * 0.3;
  }

  return content.trim();
}

function safeDecodeURIComponent(value: string): string {
  if (!value) {
    return '';
  }
  try {
    return decodeURIComponent(value);
  } catch {
    try {
      return decodeURIComponent(value.replace(/%(?![0-9A-Fa-f]{2})/g, '%25'));
    } catch {
      return value;
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

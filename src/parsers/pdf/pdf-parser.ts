import { KNOWN_SOURCE_TYPES } from '../../common-types/enums';
import type { CommonDocument, DocumentBlock } from '../../common-types/document-model';
import type { Parser, ParseRequest } from '../parser-interface';
import { extractPdfTextFromPages } from './pdf-text-extractor';
import { detectPdfScan, type PdfScanDetectionResult } from './pdf-scan-detector';
import {
  loadPdfFromBuffer,
  loadPdfFromRequest,
  type PdfPageClassification,
  type PdfPageText,
} from './pdf-source-loader';

export interface PdfParseInput extends ParseRequest {
  readonly buffer?: Buffer;
  readonly fileName?: string;
  readonly pageClassification?: PdfPageClassification;
  readonly blocks?: readonly DocumentBlock[];
  readonly pages?: readonly PdfPageText[];
  readonly rawText?: string;
}

export const PdfParser: Parser = {
  async parse(request: ParseRequest): Promise<CommonDocument> {
    const input = request as PdfParseInput;

    if (!input.sourceId) {
      throw new Error('PdfParser requires a valid sourceId.');
    }

    const { blocks, pages } = await resolvePdfContent(input);

    const finalBlocks: readonly DocumentBlock[] =
      blocks ?? extractPdfTextFromPages(pages ?? []).blocks;

    const pageTextStrings = pages
      ? pages.map((page) => page.text)
      : derivePageTexts(finalBlocks);

    const scanResult: PdfScanDetectionResult = detectPdfScan(pageTextStrings);
    const pageCount = resolvePageCount(pages, finalBlocks);

    return {
      documentId: input.documentId,
      sourceId: input.sourceId,
      sourceType: KNOWN_SOURCE_TYPES.PDF,
      blocks: finalBlocks,
      language: input.language ?? 'en',
      nativeMetadata: {
        title: input.title,
        pageCount,
        blockCount: finalBlocks.length,
        isScanned: scanResult.classification === 'scanned',
        requiresOCR: scanResult.requiresOCR,
        scanClassification: scanResult.classification,
        scanConfidence: scanResult.confidence,
        emptyOrImagePageCount: scanResult.emptyOrImagePageCount,
        averageCharsPerPage: scanResult.averageCharsPerPage,
      },
      provenance: {
        parserName: 'PdfParser',
        parserVersion: '2.0.0',
        parsedAt: new Date().toISOString(),
      },
    };
  },
};

async function resolvePdfContent(
  input: PdfParseInput,
): Promise<{ blocks?: readonly DocumentBlock[]; pages?: readonly PdfPageText[] }> {
  if (input.blocks && input.blocks.length > 0) {
    return { blocks: input.blocks };
  }

  if (input.pages && input.pages.length > 0) {
    return { pages: input.pages };
  }

  if (input.rawText && input.rawText.trim().length > 0) {
    return { pages: splitRawTextIntoPages(input.rawText) };
  }

  if (input.buffer) {
    const fileName = input.fileName ?? `${input.sourceId}.pdf`;
    const pageClassification =
      input.pageClassification ??
      (input.processingMetadata?.pdfClassification as PdfPageClassification | undefined);
    const result = await loadPdfFromBuffer(input.buffer, fileName, pageClassification);
    return result.extractionMethod === 'unstructured'
      ? { blocks: result.blocks }
      : { pages: result.pages };
  }

  if (input.storageLocation) {
    try {
      const result = await loadPdfFromRequest(input);
      return result.extractionMethod === 'unstructured'
        ? { blocks: result.blocks }
        : { pages: result.pages };
    } catch (err: unknown) {
      console.error(`[PdfParser] Failed to load PDF for source "${input.sourceId}":`, err);
      const title = input.title || 'PDF Document';
      return {
        pages: splitRawTextIntoPages(
          `PDF Content for ${title}. This document was ingested from storage location: ` +
            `${input.storageLocation}, but could not be downloaded or extracted for parsing.`,
        ),
      };
    }
  }

  throw new Error(
    `PdfParser could not resolve any content for source "${input.sourceId}": ` +
      'provide one of "storageLocation", "buffer", "blocks", "pages", or "rawText".',
  );
}

function splitRawTextIntoPages(rawText: string): PdfPageText[] {
  return rawText.split(/\f|\n--- PAGE BREAK ---\n/).map((text, index) => ({
    pageNumber: index + 1,
    text: text.trim(),
  }));
}

function derivePageTexts(blocks: readonly DocumentBlock[]): string[] {
  if (blocks.length === 0) {
    return [];
  }

  const textByPage = new Map<number, string[]>();

  for (const block of blocks) {
    const page = block.page ?? 1;
    const existing = textByPage.get(page) ?? [];
    existing.push(block.content);
    textByPage.set(page, existing);
  }

  const maxPage = Math.max(...Array.from(textByPage.keys()));
  const pageTexts: string[] = [];

  for (let page = 1; page <= maxPage; page += 1) {
    pageTexts.push((textByPage.get(page) ?? []).join('\n'));
  }

  return pageTexts;
}

function resolvePageCount(pages: readonly PdfPageText[] | undefined, blocks: readonly DocumentBlock[]): number {
  if (pages && pages.length > 0) {
    return pages.length;
  }
  if (blocks.length > 0) {
    return Math.max(...blocks.map((block) => block.page ?? 1));
  }
  return 1;
}

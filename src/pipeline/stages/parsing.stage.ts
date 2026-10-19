// /**
//  * Parsing Stage
//  *
//  * Responsibility:
//  * ----------------
//  * Convert source into CommonDocument using PdfParser, TextParser, YoutubeParser, or WebpageParser.
//  *
//  * SHOULD NOT:
//  * -----------
//  * - Normalize.
//  * - Analyze.
//  * - Chunk.
//  */

// import { JobState, KNOWN_SOURCE_TYPES } from '../../common-types/enums';
// import type { CommonDocument } from '../../common-types/document-model';
// import type { PipelineStage } from '../stage-interface';
// import type { PipelineContext } from '../pipeline-context';
// import { PdfParser } from '../../parsers/pdf/pdf-parser';
// import { UnstructuredPdfExtractor } from '../../parsers/pdf/unstructured-pdf-extractor';
// import { TextParser } from '../../parsers/text/text-parser';
// import { YoutubeParser } from '../../parsers/youtube/youtube-parser';
// import { WebpageParser } from '../../parsers/webpage/webpage.parser';
// import { ParserFactory } from '../../parsers/parser-factory';
// import { SupabaseStorageAdapter } from '../../storage/adapters/supabase.adapter';

// function safeDecodeURI(str: string): string {
//   if (!str) return '';
//   try {
//     return decodeURIComponent(str);
//   } catch {
//     try {
//       return decodeURIComponent(str.replace(/%(?![0-9A-Fa-f]{2})/g, '%25'));
//     } catch {
//       return str;
//     }
//   }
// }

// export async function extractTextFromPdfBuffer(buffer: Buffer): Promise<{ pageNumber: number; text: string }[]> {
//   return new Promise((resolve, reject) => {
//     const pdfParser = new PDFParser(null, true);

//     pdfParser.on('pdfParser_dataError', (errData: Error | { parserError: Error | string }) => {
//       const msg = errData instanceof Error ? errData.message : String(errData?.parserError || 'PDF parsing error');
//       reject(new Error(msg));
//     });

//     pdfParser.on('pdfParser_dataReady', (pdfData: { Pages?: { Texts?: { x: number; y: number; w?: number; R?: { T?: string }[] }[] }[] }) => {
//       try {
//         const pages: { pageNumber: number; text: string }[] = [];

//         if (pdfData && pdfData.Pages) {
//           pdfData.Pages.forEach((page, pageIdx) => {
//             if (!page.Texts || page.Texts.length === 0) {
//               return;
//             }

//             // Sort text elements visually: Y coordinate ascending (top to bottom), X coordinate (left to right)
//             const sortedTexts = [...page.Texts].sort((a, b) => {
//               if (Math.abs(a.y - b.y) < 0.2) {
//                 return a.x - b.x;
//               }
//               return a.y - b.y;
//             });

//             let pageContent = '';
//             let lastY: number | null = null;
//             let lastX: number | null = null;
//             let lastWidth = 0;

//             for (const item of sortedTexts) {
//               const str = (item.R || []).map((r) => safeDecodeURI(r.T || '')).join('');
//               if (!str.trim()) continue;

//               if (lastY !== null) {
//                 const deltaY = item.y - lastY;
//                 if (deltaY > 0.3) {
//                   // New line or paragraph break
//                   pageContent += deltaY > 0.8 ? '\n\n' : '\n';
//                 } else if (lastX !== null) {
//                   // Same line: check horizontal distance
//                   const expectedNextX = lastX + lastWidth;
//                   const gap = item.x - expectedNextX;
//                   if (gap > 0.35 || item.x - lastX > 0.8) {
//                     pageContent += ' ';
//                   }
//                 }
//               }

//               pageContent += str;
//               lastY = item.y;
//               lastX = item.x;
//               lastWidth = item.w || str.length * 0.3;
//             }

//             const cleanText = pageContent.trim();
//             if (cleanText.length > 0) {
//               pages.push({
//                 pageNumber: pageIdx + 1,
//                 text: cleanText,
//               });
//             }
//           });
//         }

//         resolve(pages);
//       } catch (err) {
//         reject(err);
//       }
//     });

//     pdfParser.parseBuffer(buffer);
//   });
// }

// export class ParsingStage implements PipelineStage {
//   public readonly stageName = 'ParsingStage';
//   public readonly stageState = JobState.PARSING;

//   private readonly parserFactory = new ParserFactory();
//   private readonly storageAdapter = new SupabaseStorageAdapter();
//   private readonly unstructuredPdfExtractor = new UnstructuredPdfExtractor();

//   public async execute(context: PipelineContext): Promise<PipelineContext> {
//     if (context.rawDocument) {
//       return context;
//     }

//     const sourceType =
//       context.sourceInput?.sourceType ||
//       context.sourceRecord?.sourceType ||
//       KNOWN_SOURCE_TYPES.TEXT;

//     const sourceId = context.sourceId;
//     const documentId = `doc-${sourceId}`;

//     // Resolve DocumentParser instance dynamically via Factory & Registry
//     const parser = this.parserFactory.getParser(sourceType);
//     let parseInput: any;

//     if (sourceType === KNOWN_SOURCE_TYPES.PDF) {
//       const title = context.sourceInput?.title || context.sourceRecord?.title || 'PDF Document';
//       const storageLocation =
//         context.sourceRecord?.storageLocation ||
//         (context.sourceInput && 'storageKey' in context.sourceInput ? context.sourceInput.storageKey : undefined);

//       let extractedBlocks: any[] | undefined = undefined;
//       let extractedPages: { pageNumber: number; text: string }[] = [];
//       let pdfRawText = '';

//       if (storageLocation) {
//         const objectKey = storageLocation.replace(/^supabase:\/\/[^\/]+\//, '');
//         const fileName = objectKey.split('/').pop() || `${sourceId}.pdf`;

//         try {
//           const buffer = await this.storageAdapter.download(objectKey);

//           // 1. Primary PDF Extraction: Unstructured API (partitioning with hi_res strategy)
//           const pdfClassification: any = context.processingMetadata?.pdfClassification;
//           const scannedPages: number[] = pdfClassification?.scannedImagePages || [];
//           const textPages: number[] = pdfClassification?.textBasedPages || [];

//           if (pdfClassification) {
//             console.log(`[ParsingStage] 📌 PDF Page Classification: ${textPages.length} text page(s), ${scannedPages.length} scanned image page(s).`);
//           }

//           // If ALL pages are scanned images, skip calling Unstructured API to save API credits and defer to OcrStage
//           if (pdfClassification && textPages.length === 0) {
//             console.log(`[ParsingStage] ⏩ All ${scannedPages.length} pages are scanned images. Skipping Unstructured API call to preserve credits. Deferring to OcrStage.`);
//           } else if (this.unstructuredPdfExtractor.isAvailable()) {
//             try {
//               const unstructuredResult = await this.unstructuredPdfExtractor.extractFromBuffer(buffer, fileName);
//               extractedBlocks = [...unstructuredResult.blocks];
//               console.log(`[ParsingStage] 🌐 Successfully extracted ${extractedBlocks.length} blocks via Unstructured API for source '${sourceId}'`);
//             } catch (unstructuredErr) {
//               console.warn(`[ParsingStage] ⚠️ Unstructured API partitioning error for source '${sourceId}', falling back to Scribe:`, unstructuredErr);
//             }
//           }

//           // 2. Secondary Fallback Extraction: Scribe OCR
//           if (!extractedBlocks || extractedBlocks.length === 0) {
//             extractedPages = await extractTextFromPdfBuffer(buffer);
//             pdfRawText = extractedPages.map((p) => p.text).join('\n\n--- PAGE BREAK ---\n\n');
//           }
//         } catch (err: unknown) {
//           console.error(`[ParsingStage] Error downloading/parsing PDF file for source '${sourceId}':`, err);
//           pdfRawText = `PDF Content for ${title}.\nThis document was ingested from storage location: ${storageLocation}.\nStructured extraction complete.`;
//           extractedPages = [
//             {
//               pageNumber: 1,
//               text: pdfRawText,
//             },
//           ];
//         }
//       }

//       parseInput = {
//         sourceId,
//         documentId,
//         title,
//         blocks: extractedBlocks,
//         pages: extractedPages,
//         rawText: pdfRawText,
//       };
//     } else if (sourceType === KNOWN_SOURCE_TYPES.YOUTUBE) {
//       const url =
//         (context.sourceInput && 'url' in context.sourceInput ? context.sourceInput.url : undefined) ||
//         context.sourceRecord?.originalReference ||
//         'https://www.youtube.com/watch?v=demo';
//       parseInput = {
//         sourceId,
//         documentId,
//         url,
//       };
//     } else if (sourceType === KNOWN_SOURCE_TYPES.WEBPAGE) {
//       const url =
//         (context.sourceInput && 'url' in context.sourceInput ? context.sourceInput.url : undefined) ||
//         context.sourceRecord?.originalReference ||
//         'https://example.com';
//       const title = context.sourceInput?.title || context.sourceRecord?.title;
//       parseInput = {
//         sourceId,
//         documentId,
//         url,
//         title,
//       };
//     } else {
//       const title = context.sourceInput?.title || context.sourceRecord?.title || 'Plain Text Document';
//       const storageLocation =
//         context.sourceRecord?.storageLocation ||
//         (context.sourceInput && 'storageKey' in context.sourceInput ? context.sourceInput.storageKey : undefined);

//       let rawText =
//         (context.sourceInput && 'text' in context.sourceInput ? context.sourceInput.text : undefined) || '';

//       if (!rawText && storageLocation) {
//         try {
//           const objectKey = storageLocation.replace(/^supabase:\/\/[^\/]+\//, '');
//           const buffer = await this.storageAdapter.download(objectKey);
//           rawText = buffer.toString('utf-8');
//         } catch (err: unknown) {
//           console.error(`[ParsingStage] Error downloading text file from storage for source '${sourceId}':`, err);
//         }
//       }

//       if (!rawText) {
//         rawText = context.sourceRecord?.title || 'Empty source text';
//       }

//       parseInput = {
//         sourceId,
//         documentId,
//         title,
//         text: rawText,
//       };
//     }

//     const rawDocument = await parser.parse(parseInput);

//     const stageTimings = {
//       ...(context.processingMetadata?.stageTimingsMs ?? {}),
//       [this.stageName]: Date.now(),
//     };

//     return {
//       ...context,
//       rawDocument,
//       artifactLocations: {
//         ...context.artifactLocations,
//         parsedArtifact: `/artifacts/${sourceId}/parsed.json`,
//       },
//       processingMetadata: {
//         ...context.processingMetadata,
//         stageTimingsMs: stageTimings,
//       },
//     };
//   }
// }



import { JobState, KNOWN_SOURCE_TYPES } from '../../common-types/enums';
import type { PipelineStage } from '../stage-interface';
import type { PipelineContext } from '../pipeline-context';
import type { ParseRequest } from '../../parsers/parser-interface';
import { ParserFactory } from '../../parsers/parser-factory';

/**
 * parsing-stage.ts
 *
 * Pipeline Stage: Parsing
 * -----------------------
 * Converts a validated source into a `CommonDocument`. Completely source-type-
 * agnostic: it builds exactly one `ParseRequest` describing whatever's on the source
 * (a storage location, a URL, inline text, title, pass-through metadata) and hands it
 * to whichever `Parser` the `ParserFactory` resolves for this source's type.
 *
 * This stage never branches on source type beyond picking the parser, never
 * downloads a file, never fetches a URL, and never knows how any individual format is
 * parsed - that is entirely each parser's job. E.g. `PdfParser` resolves
 * `storageLocation` into bytes and picks an extraction method internally via
 * `PdfLoader`; `YoutubeParser` resolves `url` into a transcript. Adding a new source
 * type (DOCX, Notion, GitHub, ...) never requires a change to this file - only a new
 * `Parser` implementation registered in the Parser Registry.
 *
 * SHOULD NOT:
 * -----------
 * - Normalize.
 * - Analyze.
 * - Chunk.
 * - Fetch or download anything.
 * - Know how any individual source format is parsed internally.
 */
export const ParsingStageName = 'ParsingStage';
export const ParsingStageState = JobState.PARSING;

export async function parsingStage(context: PipelineContext): Promise<PipelineContext> {
  if (context.rawDocument) {
    return context;
  }

  const sourceType = context.sourceInput?.type || context.sourceRecord?.type || KNOWN_SOURCE_TYPES.TEXT;

  const parserFactory = new ParserFactory();
  const parser = parserFactory.getParser(sourceType);
  const request = buildParseRequest(sourceType, context);
  const rawDocument = await parser.parse(request);

  return {
    ...context,
    rawDocument,
    artifactLocations: {
      ...context.artifactLocations,
      parsedArtifact: `/artifacts/${context.sourceId}/parsed.json`,
    },
    processingMetadata: {
      ...context.processingMetadata,
      stageTimingsMs: {
        ...(context.processingMetadata?.stageTimingsMs ?? {}),
        [ParsingStageName]: Date.now(),
      },
    },
  };
}

function buildParseRequest(sourceType: string, context: PipelineContext): ParseRequest {
  const sourceId = context.sourceId;

  // `language` is not on BaseSourceInput's union members; access it safely via cast.
  const sourceInputAny = context.sourceInput as any;
  const sourceRecordAny = context.sourceRecord as any;

  return {
    sourceId,
    documentId: `doc-${sourceId}`,
    sourceType,
    title: context.sourceInput?.title || context.sourceRecord?.title,
    language: sourceInputAny?.language ?? sourceRecordAny?.language,
    storageLocation:
      context.sourceRecord?.storageLocation ||
      (context.sourceInput && 'storageKey' in context.sourceInput
        ? context.sourceInput.storageKey
        : undefined),
    url:
      (context.sourceInput && 'url' in context.sourceInput ? context.sourceInput.url : undefined) || context.sourceRecord?.originalReference,
    inlineText:
      (context.sourceInput && 'text' in context.sourceInput
        ? context.sourceInput.text
        : undefined) ||
      context.sourceRecord?.content,
    cloudinaryPublicId:
      sourceInputAny?.cloudinaryPublicId ?? sourceRecordAny?.cloudinaryPublicId,
    cloudinarySecureUrl:
      sourceInputAny?.cloudinarySecureUrl ?? sourceRecordAny?.cloudinarySecureUrl,
    // Forwarded as-is; ParsingStage never reads or interprets keys inside this bag
    // (e.g. `pdfClassification` is read only by PdfParser/PdfLoader).
    processingMetadata: context.processingMetadata as Readonly<Record<string, unknown>> | undefined,
  };
}

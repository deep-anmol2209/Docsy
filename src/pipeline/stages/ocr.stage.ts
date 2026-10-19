/**
 * OCR Stage (Optical Character Recognition via Gemini Vision API)
 *
 * Responsibility:
 * ----------------
 * Inspects `CommonDocument` blocks produced by ParsingStage.
 * If any page or block contains empty, missing, or scanned-image content,
 * this stage renders/sends the PDF page to Google Gemini Vision API to extract
 * structured blocks and patch the CommonDocument.
 */

import * as fs from 'fs';
import * as path from 'path';
import { JobState, BlockType, KNOWN_SOURCE_TYPES } from '../../common-types/enums';
import type { CommonDocument, DocumentBlock } from '../../common-types/document-model';
import type { PipelineStage } from '../stage-interface';
import type { PipelineContext } from '../pipeline-context';
import { SupabaseStorageAdapter } from '../../storage/adapters/supabase.adapter';
import { buildOcrDocumentAnalysisPrompt } from '../../config/prompts';

export const OcrStageName = 'OcrStage';
export const OcrStageState = JobState.OCR;

export function shouldRunOcr(context: PipelineContext): boolean {
  const sourceType = context.sourceInput?.type || context.sourceRecord?.type || context.rawDocument?.sourceType;

  if (sourceType !== KNOWN_SOURCE_TYPES.PDF || !context.rawDocument?.blocks?.length) {
    return false;
  }

  const pdfClassification = context.processingMetadata?.pdfClassification;
  if (Array.isArray(pdfClassification?.scannedImagePages)) {
    return pdfClassification.scannedImagePages.length > 0;
  }

  const pageCharCounts = new Map<number, number>();
  for (const block of context.rawDocument.blocks) {
    const page = block.page || 1;
    const content = block.content?.trim() || '';
    const isPlaceholder = content.includes('[Scanned Image]') || content.includes('[Image]');

    if (!content || isPlaceholder) {
      return true;
    }

    pageCharCounts.set(page, (pageCharCounts.get(page) || 0) + content.length);
  }

  return Array.from(pageCharCounts.values()).some((count) => count < 20);
}

export async function ocrStage(context: PipelineContext): Promise<PipelineContext> {
  const storageAdapter = new SupabaseStorageAdapter();
  const rawDocument = context.rawDocument;

  // 0. Guard: OCR only applies to PDFs. YouTube, Text, and Markdown sources
  //    never have scanned-image pages — skip OCR entirely for them.
  const sourceType = context.sourceInput?.type || context.sourceRecord?.type || rawDocument?.sourceType;

  if (sourceType !== KNOWN_SOURCE_TYPES.PDF) {
    console.log(
      `[OCR STAGE] ⏩ Skipping OCR for source type "${sourceType}" (OCR only applies to PDF).`
    );
    return context;
  }

  if (!shouldRunOcr(context)) {
    console.log(`[OCR STAGE] ✅ OCR is not required for this PDF. Skipping OCR.`);
    return context;
  }

  // 1. Guard check: Ensure raw document exists and has blocks
  if (!rawDocument || !rawDocument.blocks || rawDocument.blocks.length === 0) {
    console.log(`[OCR STAGE] ℹ️ No document blocks found. Skipping OCR stage.`);
    return context;
  }

  // 2. Identify pages that contain empty, unextracted, or corrupted blocks
  const pagesNeedingOcr = new Set<number>();
  const emptyBlockIds = new Set<string>();

  rawDocument.blocks.forEach((block) => {
    const content = block.content?.trim() || '';
    const isContentEmpty = content.length === 0;
    const isPlaceholder = content.includes('[Scanned Image]') || content.includes('[Image]');

    if (isContentEmpty || isPlaceholder) {
      if (block.page) {
        pagesNeedingOcr.add(block.page);
      }
      emptyBlockIds.add(block.id);
    }
  });

  // Also check if any page in the document has 0 total characters
  const pageCharCounts: Record<number, number> = {};
  rawDocument.blocks.forEach((block) => {
    const page = block.page || 1;
    pageCharCounts[page] = (pageCharCounts[page] || 0) + (block.content?.trim().length || 0);
  });

  Object.entries(pageCharCounts).forEach(([pageStr, count]) => {
    if (count < 20) {
      pagesNeedingOcr.add(Number(pageStr));
    }
  });

  // Incorporate pages pre-classified as scanned image by PdfClassifierStage
  const pdfClassification: any = context.processingMetadata?.pdfClassification;
  if (pdfClassification?.scannedImagePages && Array.isArray(pdfClassification.scannedImagePages)) {
    pdfClassification.scannedImagePages.forEach((p: number) => pagesNeedingOcr.add(p));
  }

  const targetPages = Array.from(pagesNeedingOcr).sort((a, b) => a - b);

  // 3. If no empty or scanned pages are detected, skip OCR stage
  if (targetPages.length === 0) {
    console.log(`[OCR STAGE] ✅ All ${rawDocument.blocks.length} blocks contain valid text. No OCR repair required.`);
    return context;
  }

  console.log(`[OCR STAGE] ⚠️ Detected ${targetPages.length} page(s) requiring Vision OCR (Page numbers: ${targetPages.join(', ')}).`);

  // 4. Verify Gemini API key availability
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.warn(`[OCR STAGE] ⚠️ GEMINI_API_KEY is missing from environment variables. Cannot perform Vision OCR repair.`);
    return context;
  }

  // 5. Download PDF buffer to send to Gemini Vision API
  const storageLocation =
    context.sourceRecord?.storageLocation ||
    (context.sourceInput && 'storageKey' in context.sourceInput ? context.sourceInput.storageKey : undefined);

  if (!storageLocation) {
    console.warn(`[OCR STAGE] ⚠️ Storage location unavailable for source '${context.sourceId}'. Skipping OCR.`);
    return context;
  }

  try {
    const objectKey = storageLocation.replace(/^supabase:\/\/[^\/]+\//, '');
    const pdfBuffer = await storageAdapter.download(objectKey);
    const base64Pdf = pdfBuffer.toString('base64');

    console.log(`[OCR STAGE] 🌐 Invoking Gemini 1.5 Flash Vision API for source '${context.sourceId}' (${pdfBuffer.length} bytes)...`);

    // 6. Call Gemini Vision REST API natively
    const prompt = buildOcrDocumentAnalysisPrompt(targetPages);

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                {
                  inlineData: {
                    mimeType: 'application/pdf',
                    data: base64Pdf,
                  },
                },
                { text: prompt },
              ],
            },
          ],
          generationConfig: {
            responseMimeType: 'application/json',
            temperature: 0.1,
          },
        }),
      }
    );

    if (!response.ok) {
      const errText = await response.text();
      console.error(`[OCR STAGE] ❌ Gemini Vision API request failed (${response.status}): ${errText}`);
      return context;
    }

    const resData = await response.json();
    const rawTextResponse = resData.candidates?.[0]?.content?.parts?.[0]?.text || '[]';

    // Clean response string in case markdown code blocks are returned
    const cleanJsonStr = rawTextResponse.replace(/```json\\n?|\\n?```/g, '').trim();
    const extractedVisionBlocks: any[] = JSON.parse(cleanJsonStr);

    console.log(`[OCR STAGE] ✨ Gemini Vision API returned ${extractedVisionBlocks.length} OCR blocks.`);

    // 7. Re-assemble CommonDocument blocks by removing empty blocks for target pages and replacing them with Vision blocks
    const existingGoodBlocks = rawDocument.blocks.filter((b) => !targetPages.includes(b.page || 1) && !emptyBlockIds.has(b.id));

    const newVisionBlocks: DocumentBlock[] = extractedVisionBlocks.map((vb, idx) => {
      let blockType = BlockType.PARAGRAPH;
      const typeStr = String(vb.type || '').toLowerCase();
      if (typeStr.includes('head')) blockType = BlockType.HEADING;
      else if (typeStr.includes('list')) blockType = BlockType.LIST_ITEM;
      else if (typeStr.includes('table')) blockType = BlockType.TABLE;

      return {
        id: `gemini-ocr-block-${vb.page || 1}-${idx}`,
        type: blockType,
        content: String(vb.content || '').trim(),
        order: existingGoodBlocks.length + idx,
        page: vb.page || targetPages[0] || 1,
        headingLevel: vb.headingLevel,
        nativeMetadata: {
          ocrEngine: 'gemini-1.5-flash-vision',
          extractedAt: new Date().toISOString(),
        },
      };
    });

    const updatedBlocks = [...existingGoodBlocks, ...newVisionBlocks].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));

    const updatedRawDocument: CommonDocument = {
      ...rawDocument,
      blocks: updatedBlocks,
      nativeMetadata: {
        ...rawDocument.nativeMetadata,
        ocrApplied: true,
        ocrTargetPages: targetPages,
        ocrEngine: 'gemini-1.5-flash-vision',
      },
    };

    // 8. Save updated CommonDocument to debug text file
    try {
      const outputDir = path.join(process.cwd(), 'extracted_texts');
      if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
      }
      const ocrDocJson = JSON.stringify(updatedRawDocument, null, 2);
      fs.writeFileSync(path.join(outputDir, 'ocr_repaired_commondoc.txt'), ocrDocJson, 'utf-8');
      fs.writeFileSync(path.join(process.cwd(), 'ocr_repaired_commondoc.txt'), ocrDocJson, 'utf-8');
      console.log(`[OCR STAGE] 💾 Saved repaired CommonDocument to 'ocr_repaired_commondoc.txt'`);
    } catch (err) {
      console.error(`[OCR STAGE] ⚠️ Failed to save ocr_repaired_commondoc.txt:`, err);
    }

    console.log(`[OCR STAGE] 🎉 Successfully repaired CommonDocument! Block count: ${rawDocument.blocks.length} -> ${updatedBlocks.length}`);

    return {
      ...context,
      rawDocument: updatedRawDocument,
    };
  } catch (err: unknown) {
    console.error(`[OCR STAGE] ❌ Error executing Gemini Vision OCR:`, err);
    return context;
  }
}


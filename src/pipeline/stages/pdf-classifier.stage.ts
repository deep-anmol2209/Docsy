/**
 * PDF Classifier Stage
 *
 * Responsibility:
 * ----------------
 * Pre-analyzes PDF sources using PdfInspector before ParsingStage.
 * Classifies pages into searchable text vs scanned images so that ParsingStage
 * only sends non-scanned pages to Unstructured API, leaving scanned pages
 * for the Gemini Vision OCR stage.
 */

import { JobState, KNOWN_SOURCE_TYPES } from '../../common-types/enums';
import type { PipelineStage } from '../stage-interface';
import type { PipelineContext } from '../pipeline-context';
import { inspectPdfBuffer } from '../../parsers/pdf/pdf-inspector';
import { SupabaseStorageAdapter } from '../../storage/adapters/supabase.adapter';

export const PdfClassifierStageName = 'PdfClassifierStage';
export const PdfClassifierStageState = JobState.VALIDATING;

export async function pdfClassifierStage(context: PipelineContext): Promise<PipelineContext> {
  const storageAdapter = new SupabaseStorageAdapter();

  const sourceType =
    context.sourceInput?.type ||
    context.sourceRecord?.type ||
    KNOWN_SOURCE_TYPES.TEXT;

  if (sourceType !== KNOWN_SOURCE_TYPES.PDF) {
    return context;
  }

  const storageLocation =
    context.sourceRecord?.storageLocation ||
    (context.sourceInput && 'storageKey' in context.sourceInput ? context.sourceInput.storageKey : undefined);

  if (!storageLocation) {
    return context;
  }

  try {
    const objectKey = storageLocation.replace(/^supabase:\/\/[^\/]+\//, '');
    const buffer = await storageAdapter.download(objectKey);

    console.log(`[PDF CLASSIFIER STAGE] 🔍 Inspecting & classifying PDF pages for source '${context.sourceId}'...`);
    const classification = await inspectPdfBuffer(buffer);

    return {
      ...context,
      processingMetadata: {
        ...context.processingMetadata,
        pdfClassification: classification as unknown as Record<string, unknown>,
      },
    };
  } catch (err) {
    console.warn(`[PDF CLASSIFIER STAGE] ⚠️ Error during PDF inspection for '${context.sourceId}':`, err);
    return context;
  }
}


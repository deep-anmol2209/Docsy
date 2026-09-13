/**
 * Markdown Conversion Stage
 *
 * Responsibility:
 * ----------------
 * Convert CommonDocument into formatted Markdown if recommended by Analyzer.
 * Store generated Markdown as an artifact in storage (artifacts/markdown/document.md).
 *
 * SHOULD NOT:
 * -----------
 * - Decide whether Markdown is needed (owned by Analyzer).
 * - Chunk document (owned by Chunker).
 */

import { JobState, KNOWN_SOURCE_TYPES } from '../../common-types/enums';
import type { PipelineContext } from '../pipeline-context';
import { DefaultMarkdownConverter } from '../../markdown-converter';
import { SupabaseStorageAdapter } from '../../storage/adapters/supabase.adapter';

export const MarkdownConversionStageName = 'MarkdownConversionStage';
export const MarkdownConversionStageState = JobState.CONVERTING_MARKDOWN;

export async function markdownConversionStage(context: PipelineContext): Promise<PipelineContext> {
  const markdownConverter = new DefaultMarkdownConverter();
  const storageAdapter = new SupabaseStorageAdapter();

  const analysis = context.analysisResult;
  const document = context.normalizedDocument || context.rawDocument;
  const sourceType = context.rawDocument?.sourceType || context.sourceInput?.type || context.sourceRecord?.type;

  // PDF sources use Unstructured API partitioning directly and skip Markdown conversion
  if (sourceType === KNOWN_SOURCE_TYPES.PDF) {
    console.log(`[MarkdownConversionStage] ℹ️ PDF source '${context.sourceId}' processed via Unstructured API. Skipping Markdown conversion stage.`);
    return context;
  }

  // Check if Markdown conversion was recommended by Analyzer
  if (analysis?.recommendedIntermediateFormat !== 'markdown') {
    console.log(
      `[MarkdownConversionStage] ℹ️ Analyzer recommended format '${analysis?.recommendedIntermediateFormat || 'text'}'. Skipping Markdown conversion.`
    );
    return context;
  }

  if (!document) {
    throw new Error('[MarkdownConversionStage] Conversion Failed: CommonDocument missing in PipelineContext');
  }

  console.log(`[MarkdownConversionStage] 📝 Converting PDF/Document to Markdown for sourceId '${context.sourceId}'...`);
  if (analysis.formatSelectionReasoning && analysis.formatSelectionReasoning.length > 0) {
    console.log(`[MarkdownConversionStage] Reasoning:\n  - ${analysis.formatSelectionReasoning.join('\n  - ')}`);
  }

  const markdownContent = await markdownConverter.convert(document);
  const storageKey = `artifacts/markdown/${context.sourceId}.md`;

  try {
    await storageAdapter.upload(storageKey, Buffer.from(markdownContent, 'utf-8'), {
      mimeType: 'text/markdown',
      customMetadata: {
        sourceId: context.sourceId,
        documentId: document.documentId,
      },
    });
    console.log(`[MarkdownConversionStage] 💾 Saved Markdown artifact to storage: '${storageKey}' (${markdownContent.length} bytes)`);
  } catch (err) {
    console.warn(`[MarkdownConversionStage] ⚠️ Storage upload notice for '${storageKey}':`, err);
  }

  const stageTimings = {
    ...(context.processingMetadata?.stageTimingsMs ?? {}),
    [MarkdownConversionStageName]: Date.now(),
  };

  return {
    ...context,
    markdownContent,
    artifactLocations: {
      ...context.artifactLocations,
      markdownArtifact: storageKey,
    },
    processingMetadata: {
      ...context.processingMetadata,
      stageTimingsMs: stageTimings,
    },
  };
}


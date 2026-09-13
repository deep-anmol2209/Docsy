/**
 * Metadata Enrichment Stage
 *
 * Responsibility:
 * ----------------
 * Enrich document and chunk metadata.
 *
 * SHOULD NOT:
 * -----------
 * - Generate embeddings.
 */

import { JobState } from '../../common-types/enums';
import type { Chunk } from '../../common-types/chunk-model';
import type { PipelineStage } from '../stage-interface';
import type { PipelineContext } from '../pipeline-context';

export const EnrichmentStageName = 'EnrichmentStage';
export const EnrichmentStageState = JobState.ENRICHING;

export async function enrichmentStage(context: PipelineContext): Promise<PipelineContext> {
  const draftChunks = context.draftChunks || [];

  const enrichedChunks: Chunk[] = draftChunks.map((draft, idx) => {
    const containsCode = /```|function|const|let|var|class/.test(draft.content);
    const containsTable = /\|.*\|.*\|/.test(draft.content);

    return {
      ...draft,
      id: `chk-${context.sourceId}-${draft.order ?? idx}`,
      enrichmentFlags: {
        containsCode,
        containsTable,
        isHeading: Boolean(draft.position.heading),
      },
    };
  });

  const stageTimings = {
    ...(context.processingMetadata?.stageTimingsMs ?? {}),
    [EnrichmentStageName]: Date.now(),
  };

  return {
    ...context,
    chunks: enrichedChunks,
    processingMetadata: {
      ...context.processingMetadata,
      stageTimingsMs: stageTimings,
    },
  };
}

/**
 * Normalization Stage
 *
 * Responsibility:
 * ----------------
 * Normalize parsed document.
 *
 * SHOULD NOT:
 * -----------
 * - Analyze document.
 */

import { JobState } from '../../common-types/enums';
import type { PipelineStage } from '../stage-interface';
import type { PipelineContext } from '../pipeline-context';
import { createNormalizationPipeline } from '../../normalization/normalizer.factory';

export const NormalizationStageName = 'NormalizationStage';
export const NormalizationStageState = JobState.NORMALIZING;

export async function normalizationStage(context: PipelineContext): Promise<PipelineContext> {
  const docToNormalize = context.rawDocument;

  if (!docToNormalize) {
    throw new Error('[NormalizationStage] Normalization Failed: rawDocument is missing in PipelineContext');
  }

  const normalizerPipeline = createNormalizationPipeline();
  const normalizedDocument = await normalizerPipeline.normalize(docToNormalize);

  const stageTimings = {
    ...(context.processingMetadata?.stageTimingsMs ?? {}),
    [NormalizationStageName]: Date.now(),
  };

  return {
    ...context,
    normalizedDocument,
    artifactLocations: {
      ...context.artifactLocations,
      normalizedArtifact: `/artifacts/${context.sourceId}/normalized.json`,
    },
    processingMetadata: {
      ...context.processingMetadata,
      stageTimingsMs: stageTimings,
    },
  };
}

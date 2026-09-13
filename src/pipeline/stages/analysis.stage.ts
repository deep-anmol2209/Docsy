/**
 * Analysis Stage
 *
 * Responsibility:
 * ----------------
 * Analyze normalized document.
 *
 * SHOULD NOT:
 * -----------
 * - Execute OCR.
 * - Chunk document.
 */

import { JobState } from '../../common-types/enums';
import type { PipelineStage } from '../stage-interface';
import type { PipelineContext } from '../pipeline-context';
import { analyzeDocument } from '../../analyzer/analyzer-orchestrator';

export const AnalysisStageName = 'AnalysisStage';
export const AnalysisStageState = JobState.ANALYZING;

export async function analysisStage(context: PipelineContext): Promise<PipelineContext> {
  const docToAnalyze = context.normalizedDocument || context.rawDocument;

  if (!docToAnalyze) {
    throw new Error('[AnalysisStage] Analysis Failed: No document found in PipelineContext');
  }

  const analysisResult = await analyzeDocument(docToAnalyze);

  const stageTimings = {
    ...(context.processingMetadata?.stageTimingsMs ?? {}),
    [AnalysisStageName]: Date.now(),
  };

  return {
    ...context,
    analysisResult,
    artifactLocations: {
      ...context.artifactLocations,
      analysisArtifact: `/artifacts/${context.sourceId}/analysis.json`,
    },
    processingMetadata: {
      ...context.processingMetadata,
      stageTimingsMs: stageTimings,
    },
  };
}

/**
 * Strategy Selection Stage
 *
 * Responsibility:
 * ----------------
 * Select final chunk strategy.
 *
 * SHOULD NOT:
 * -----------
 * - Execute chunking.
 */

import { JobState, ChunkStrategyName, DocumentType, KNOWN_SOURCE_TYPES } from '../../common-types/enums';
import type { PipelineStage } from '../stage-interface';
import type { PipelineContext } from '../pipeline-context';

export const StrategySelectionStageName = 'StrategySelectionStage';
export const StrategySelectionStageState = JobState.SELECTING_STRATEGY;

export async function strategySelectionStage(context: PipelineContext): Promise<PipelineContext> {
  const analysis = context.analysisResult;
  const sourceType = context.rawDocument?.sourceType || context.sourceInput?.type || context.sourceRecord?.type;

  let selectedStrategy: ChunkStrategyName = ChunkStrategyName.PARAGRAPH;

  if (sourceType === KNOWN_SOURCE_TYPES.PDF) {
    if (analysis?.documentType === DocumentType.RESEARCH_PAPER) {
      selectedStrategy = ChunkStrategyName.RESEARCH_PAPER;
    } else if (analysis?.documentType === DocumentType.PRESENTATION) {
      selectedStrategy = ChunkStrategyName.SLIDE;
    } else if (analysis?.structureType === 'structured') {
      selectedStrategy = ChunkStrategyName.HEADING;
    } else {
      selectedStrategy = ChunkStrategyName.PARAGRAPH;
    }
  } else if (analysis?.recommendedIntermediateFormat === 'markdown') {
    selectedStrategy = ChunkStrategyName.MARKDOWN_HEADING;
  } else if (sourceType === KNOWN_SOURCE_TYPES.YOUTUBE || analysis?.documentType === DocumentType.TRANSCRIPT) {
    selectedStrategy = ChunkStrategyName.TRANSCRIPT;
  } else if (analysis?.documentType === DocumentType.RESEARCH_PAPER) {
    selectedStrategy = ChunkStrategyName.RESEARCH_PAPER;
  } else if (analysis?.documentType === DocumentType.PRESENTATION) {
    selectedStrategy = ChunkStrategyName.SLIDE;
  } else if (analysis?.structureType === 'structured') {
    selectedStrategy = ChunkStrategyName.HEADING;
  }

  const stageTimings = {
    ...(context.processingMetadata?.stageTimingsMs ?? {}),
    [StrategySelectionStageName]: Date.now(),
  };

  return {
    ...context,
    selectedStrategy,
    processingMetadata: {
      ...context.processingMetadata,
      stageTimingsMs: stageTimings,
    },
  };
}

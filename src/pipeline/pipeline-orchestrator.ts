/**
 * Pipeline orchestration helpers with Supabase DB persistence.
 *
 * Responsibility:
 * ----------------
 * Execute every stage in order and persist job state while keeping the flow
 * function-oriented rather than class-oriented.
 */

import { JobState } from '../common-types/enums';
import type { Job, JobStageHistoryEntry } from '../common-types/job.model';
import type { PipelineContext } from './pipeline-context';
import type { PipelineStage } from './stage-interface';
import { getBackoffDelayMs, shouldRetry } from './retry-policy';
import { prisma } from '../../lib/db';

import { validationStage, ValidationStageName, ValidationStageState } from './stages/validation.stage';
import { pdfClassifierStage, PdfClassifierStageName, PdfClassifierStageState } from './stages/pdf-classifier.stage';
import { parsingStage, ParsingStageName, ParsingStageState } from './stages/parsing.stage';
import { ocrStage, OcrStageName, OcrStageState } from './stages/ocr.stage';
import { normalizationStage, NormalizationStageName, NormalizationStageState } from './stages/normalization.stage';
import { analysisStage, AnalysisStageName, AnalysisStageState } from './stages/analysis.stage';
import { markdownConversionStage, MarkdownConversionStageName, MarkdownConversionStageState } from './stages/markdown-conversion.stage';
import { strategySelectionStage, StrategySelectionStageName, StrategySelectionStageState } from './stages/strategy-selection.stage';
import { chunkingStage, ChunkingStageName, ChunkingStageState } from './stages/chunking.stage';
import { enrichmentStage, EnrichmentStageName, EnrichmentStageState } from './stages/enrichment.stage';
import { embeddingStage, EmbeddingStageName, EmbeddingStageState } from './stages/embedding.stage';
import { vectorWriteStage, VectorWriteStageName, VectorWriteStageState } from './stages/vector-write.stage';

type PrismaCompatClient = {
  job: {
    update: (args: Record<string, unknown>) => Promise<unknown>;
  };
  source: {
    update: (args: Record<string, unknown>) => Promise<unknown>;
  };
  document: {
    upsert: (args: Record<string, unknown>) => Promise<unknown>;
  };
  documentBlock: {
    createMany: (args: Record<string, unknown>) => Promise<unknown>;
  };
  chunk: {
    createMany: (args: Record<string, unknown>) => Promise<unknown>;
  };
};

const prismaCompat = prisma as unknown as PrismaCompatClient;

function toPrismaJobState(state?: string): string {
  if (!state) return 'QUEUED';
  return String(state).toUpperCase();
}

export function createPipelineStages(customStages?: PipelineStage[]): PipelineStage[] {
  return customStages ?? [
    { stageName: ValidationStageName, stageState: ValidationStageState, execute: validationStage },
    { stageName: PdfClassifierStageName, stageState: PdfClassifierStageState, execute: pdfClassifierStage },
    { stageName: ParsingStageName, stageState: ParsingStageState, execute: parsingStage },
    { stageName: OcrStageName, stageState: OcrStageState, execute: ocrStage },
    { stageName: NormalizationStageName, stageState: NormalizationStageState, execute: normalizationStage },
    { stageName: AnalysisStageName, stageState: AnalysisStageState, execute: analysisStage },
    { stageName: MarkdownConversionStageName, stageState: MarkdownConversionStageState, execute: markdownConversionStage },
    { stageName: StrategySelectionStageName, stageState: StrategySelectionStageState, execute: strategySelectionStage },
    { stageName: ChunkingStageName, stageState: ChunkingStageState, execute: chunkingStage },
    { stageName: EnrichmentStageName, stageState: EnrichmentStageState, execute: enrichmentStage },
    { stageName: EmbeddingStageName, stageState: EmbeddingStageState, execute: embeddingStage },
    { stageName: VectorWriteStageName, stageState: VectorWriteStageState, execute: vectorWriteStage },
  ];
}

export async function runPipeline(initialContext: PipelineContext, customStages?: PipelineStage[]): Promise<PipelineContext> {
  console.log(`\n======================================================================`);
  console.log(`[PIPELINE ORCHESTRATOR] 🚀 Starting pipeline for sourceId: '${initialContext.sourceId}', jobId: '${initialContext.jobId}'`);
  console.log(`======================================================================\n`);

  const stages = createPipelineStages(customStages);
  let currentContext = initialContext;

  for (const stage of stages) {
    console.log(`[PIPELINE STAGE START] ▶️ Executing '${stage.stageName}' (${stage.stageState})...`);

    const prismaStage = toPrismaJobState(stage.stageState);

    try {
      await prismaCompat.job.update({
        where: { id: currentContext.jobId },
        data: {
          currentStage: prismaStage,
          state: prismaStage,
          stageHistory: { create: { stage: prismaStage } },
        },
      });
      await prismaCompat.source.update({
        where: { id: currentContext.sourceId },
        data: { ingestionStatus: prismaStage },
      });
    } catch (err) {
      console.warn('[WORKER DB SYNC STAGE] Notice:', err);
    }

    currentContext = await executeStageWithRetry(stage, currentContext);

    if (currentContext.job.state === JobState.FAILED) {
      console.error(`[PIPELINE FAILURE] ❌ Pipeline aborted at stage '${stage.stageName}'. Error:`, currentContext.job.lastError?.message);

      try {
        await prismaCompat.job.update({
          where: { id: currentContext.jobId },
          data: {
            state: 'FAILED',
            failureReason: currentContext.job.lastError?.message,
          },
        });
        await prismaCompat.source.update({
          where: { id: currentContext.sourceId },
          data: { ingestionStatus: 'FAILED' },
        });
      } catch (err) {
        console.warn('[WORKER DB SYNC FAILURE] Notice:', err);
      }
      break;
    }

    logStageSummary(stage, currentContext);
    console.log(`[PIPELINE STAGE END] ✅ Completed '${stage.stageName}' (${stage.stageState}).\n`);
  }
  console.log("going to if");
  


console.log("currentcontext: ", currentContext.job.state);

if (currentContext.job.state !== JobState.FAILED) {
  const doc =
    currentContext.normalizedDocument ||
    currentContext.rawDocument;

  const blocks = doc?.blocks ?? [];
  const chunks =
    currentContext.chunks ||
    currentContext.draftChunks ||
    [];

  // ==========================================
  // 1. EMPTY CONTENT => FAIL
  // ==========================================

  if (blocks.length === 0 && chunks.length === 0) {
    const reason =
      "Ingestion completed without producing any document content.";

    await prismaCompat.job.update({
      where: { id: initialContext.jobId },
      data: {
        state: JobState.FAILED,
        currentStage: JobState.FAILED,
        failureReason: reason,
      },
    });

    await prismaCompat.source.update({
      where: { id: initialContext.sourceId },
      data: {
        ingestionStatus: JobState.FAILED,
      },
    });

    return {
      ...currentContext,
      job: {
        ...currentContext.job,
        state: JobState.FAILED,
        lastError: {
          message: reason,
          stage: JobState.FAILED,
          isRetryable: false,
          occurredAt: new Date().toISOString(),
        },
      },
    };
  }

  // ==========================================
  // 2. SAVE DOCUMENT
  // ==========================================

  const docId = `doc-${initialContext.sourceId}`;

  console.log("[WORKER DB SYNC] Saving document...", {
    docId,
    blocks: blocks.length,
    chunks: chunks.length,
  });

  await prismaCompat.document.upsert({
    where: {
      id: docId,
    },
    update: {
      chunkCount: chunks.length,
    },
    create: {
      id: docId,
      sourceId: initialContext.sourceId,
      title: currentContext.sourceRecord?.title || "Document",
      documentType: "STRUCTURED",
      chunkCount: chunks.length,
      parserName: doc?.provenance?.parserName || "UnknownParser",
      parserVersion: doc?.provenance?.parserVersion || "1.0.0",
      analyzerVersion: "1.0.0",
    },
  });

  console.log("[WORKER DB SYNC] ✅ Document saved:", docId);

  // ==========================================
  // 3. SAVE DOCUMENT BLOCKS
  // ==========================================

  if (blocks.length > 0) {
    await prismaCompat.documentBlock.createMany({
      data: blocks.map((b: any, i: number) => ({
        id: b.id || `blk-${initialContext.sourceId}-${i}`,
        documentId: docId,
        type: (b.type || "PARAGRAPH") as any,
        content: b.content || "",
        order: b.order ?? i,
        page: b.page,
        headingLevel: b.headingLevel,
        slideNumber: b.slideNumber,
        startTimeSeconds: b.startTimeSeconds,
        endTimeSeconds: b.endTimeSeconds,
        speaker: b.speaker,
        language: b.language,
      })),
      skipDuplicates: true,
    });

    console.log(
      `[WORKER DB SYNC] ✅ Saved ${blocks.length} document blocks`
    );
  }

  // ==========================================
  // 4. SAVE CHUNKS
  // ==========================================

  if (chunks.length > 0) {
    await prismaCompat.chunk.createMany({
      data: chunks.map((c: any, i: number) => ({
        id: c.id || `chk-${initialContext.sourceId}-${i}`,
        documentId: docId,
        sourceId: initialContext.sourceId,
        order: c.order ?? i,
        content: c.content,
        strategy: String(c.strategy || "paragraph"),
        page: c.position?.page,
        heading: c.position?.heading,
        section: c.position?.section,
        startTimeSeconds: c.position?.startTimeSeconds,
        endTimeSeconds: c.position?.endTimeSeconds,
        slideNumber: c.position?.slideNumber,
        transcriptLines: c.position?.transcriptLines
          ? c.position.transcriptLines
          : undefined,
        tokenCount: c.tokenCount || 0,
      })),
      skipDuplicates: true,
    });

    console.log(
      `[WORKER DB SYNC] ✅ Saved ${chunks.length} chunks`
    );
  }

  // ==========================================
  // 5. ONLY NOW => COMPLETED
  // ==========================================

  await prismaCompat.job.update({
    where: {
      id: initialContext.jobId,
    },
    data: {
      state: JobState.COMPLETED,
      currentStage: JobState.COMPLETED,
    },
  });

  await prismaCompat.source.update({
    where: {
      id: initialContext.sourceId,
    },
    data: {
      ingestionStatus: JobState.COMPLETED,
    },
  });

  currentContext = {
    ...currentContext,
    job: {
      ...currentContext.job,
      state: JobState.COMPLETED,
      updatedAt: new Date().toISOString(),
    },
  };

  console.log(
    `[PIPELINE COMPLETED] 🎉 Source '${initialContext.sourceId}' completed.`
  );
}

return currentContext;

function logStageSummary(stage: PipelineStage, context: PipelineContext) {
  switch (stage.stageName) {
    case 'ValidationStage':
      console.log(`[STAGE RESULT: ValidationStage] 🔍 Source verified. Type: '${context.sourceRecord?.type}', Storage: '${context.sourceRecord?.storageLocation}'`);
      break;
    case 'PdfClassifierStage':
      console.log(`[STAGE RESULT: PdfClassifierStage] 🔍 PDF Classification Complete.`);
      break;
    case 'ParsingStage':
      console.log(`[STAGE RESULT: ParsingStage] 📄 Document Parsed. Blocks: ${context.rawDocument?.blocks.length || 0}`);
      break;
    case 'OcrStage':
      console.log(`[STAGE RESULT: OcrStage] 👁️ OCR Check/Repair Complete. Total Blocks: ${context.rawDocument?.blocks.length || 0}`);
      break;
    case 'NormalizationStage':
      console.log(`[STAGE RESULT: NormalizationStage] 🧹 Text Normalized. Blocks: ${context.normalizedDocument?.blocks.length || 0}`);
      break;
    case 'AnalysisStage':
      console.log(`[STAGE RESULT: AnalysisStage] 📊 Document Analyzed. Type: '${context.analysisResult?.documentType}', Recommended Format: '${context.analysisResult?.recommendedIntermediateFormat || 'text'}'`);
      break;
    case 'MarkdownConversionStage':
      console.log(`[STAGE RESULT: MarkdownConversionStage] 📝 Markdown Conversion: ${context.markdownContent ? 'Executed' : 'Skipped'}. Artifact: '${context.artifactLocations?.markdownArtifact || 'N/A'}'`);
      break;
    case 'StrategySelectionStage':
      console.log(`[STAGE RESULT: StrategySelectionStage] 🎯 Strategy Selected: '${context.selectedStrategy}'`);
      break;
    case 'ChunkingStage':
      console.log(`[STAGE RESULT: ChunkingStage] 🧩 Chunks Generated: ${context.draftChunks?.length || context.chunks?.length || 0}`);
      break;
    case 'EnrichmentStage':
      console.log(`[STAGE RESULT: EnrichmentStage] ✨ Enriched ${context.chunks?.length || 0} final chunks.`);
      break;
    case 'EmbeddingStage':
      console.log(`[STAGE RESULT: EmbeddingStage] 🧠 Embeddings Generated: ${context.embeddings?.length || 0} vectors.`);
      break;
    case 'VectorWriteStage':
      console.log(`[STAGE RESULT: VectorWriteStage] 💾 Vector Store Sync Complete.`);
      break;
  }
}

async function executeStageWithRetry(stage: PipelineStage, context: PipelineContext): Promise<PipelineContext> {
  let attempt = 0;
  let lastError: Error | undefined;

  const enteredAt = new Date().toISOString();
  const currentJob: Job = {
    ...context.job,
    state: stage.stageState,
    updatedAt: enteredAt,
  };

  const currentContext: PipelineContext = {
    ...context,
    job: currentJob,
  };

  while (true) {
    try {
      const nextContext = await stage.execute(currentContext);
      const exitedAt = new Date().toISOString();
      const historyEntry: JobStageHistoryEntry = {
        stage: stage.stageState,
        enteredAt,
        exitedAt,
      };

      return {
        ...nextContext,
        job: {
          ...nextContext.job,
          stageHistory: [...nextContext.job.stageHistory, historyEntry],
          updatedAt: exitedAt,
        },
      };
    } catch (err: unknown) {
      lastError = err instanceof Error ? err : new Error(String(err));
      attempt++;
      console.warn(`[PIPELINE STAGE RETRY] ⚠️ Stage '${stage.stageName}' failed (attempt ${attempt}): ${lastError.message}`);

      if (shouldRetry(attempt, lastError)) {
        const delayMs = getBackoffDelayMs(attempt - 1);
        await new Promise((resolve) => setTimeout(resolve, delayMs));
      } else {
        const exitedAt = new Date().toISOString();
        const jobError = {
          message: lastError.message,
          stage: stage.stageState,
          isRetryable: false,
          occurredAt: exitedAt,
        };

        return {
          ...currentContext,
          job: {
            ...currentContext.job,
            state: JobState.FAILED,
            stageHistory: [...currentContext.job.stageHistory, { stage: stage.stageState, enteredAt, exitedAt, error: jobError }],
            retryCount: attempt,
            lastError: jobError,
            updatedAt: exitedAt,
          },
        };
      }
    }
  }
}
}
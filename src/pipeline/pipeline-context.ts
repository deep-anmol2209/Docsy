/**
 * Pipeline Context
 *
 * Responsibility:
 * ----------------
 * Shared object passed through every pipeline stage.
 *
 * NOTE:
 * -----
 * Every stage reads and updates this object.
 *
 * SHOULD NOT:
 * -----------
 * - Contain business logic.
 */

import type { SourceInput } from '../common-types/source-model';
import type { SourceRecord } from '../schema/sources.schema';
import type { Job } from '../common-types/job.model';
import type { CommonDocument } from '../common-types/document-model';
import type { AnalysisResult } from '../analyzer/analysis-result-model';
import type { ChunkStrategyName } from '../common-types/enums';
import type { Chunk, DraftChunk } from '../common-types/chunk-model';

export interface VectorStoreWriteResult {
  readonly insertedCount: number;
  readonly collectionName?: string;
  readonly writtenAt: string;
}

export interface PipelineArtifactLocations {
  readonly parsedArtifact?: string;
  readonly normalizedArtifact?: string;
  readonly analysisArtifact?: string;
  readonly markdownArtifact?: string;
  readonly chunkArtifact?: string;
  readonly embeddingArtifact?: string;
}

export interface PipelineProcessingMetadata {
  readonly stageTimingsMs?: Record<string, number>;
  readonly userInstructions?: Record<string, unknown>;
  readonly extraParams?: Record<string, unknown>;
  readonly pdfClassification?: Record<string, unknown>;
}

export interface PipelineContext {
  readonly sourceId: string;
  readonly jobId: string;
  readonly sourceInput?: SourceInput;
  readonly sourceRecord?: SourceRecord;
  readonly job: Job;
  readonly rawDocument?: CommonDocument;
  readonly normalizedDocument?: CommonDocument;
  readonly analysisResult?: AnalysisResult;
  readonly markdownContent?: string;
  readonly selectedStrategy?: ChunkStrategyName;
  readonly draftChunks?: readonly DraftChunk[];
  readonly chunks?: readonly Chunk[];
  readonly embeddings?: readonly (readonly number[])[];
  readonly vectorStoreResult?: VectorStoreWriteResult;
  readonly artifactLocations?: PipelineArtifactLocations;
  readonly processingMetadata?: PipelineProcessingMetadata;
}
export interface ProvenanceRecord {
  readonly documentId: string;
  readonly parserName: string;
  readonly parserVersion: string;
  readonly normalizerVersion: string;
  readonly analyzerVersion: string;
  readonly chunkStrategyUsed?: string;
  readonly embeddingModel?: string;
  readonly pipelineVersion: string;
  readonly processedAt: string;
}

export interface ProvenanceEnricherInput {
  readonly documentId: string;
  readonly parserName: string;
  readonly parserVersion: string;
  readonly normalizerVersion?: string;
  readonly analyzerVersion?: string;
  readonly chunkStrategyUsed?: string;
  readonly embeddingModel?: string;
  readonly pipelineVersion?: string;
}

/**
 * Provenance Enricher
 *
 * Responsibility:
 * ----------------
 * Build execution provenance tracking data for auditing, reproducibility, and migrations.
 */
export class ProvenanceEnricher {
  public createRecord(input: ProvenanceEnricherInput): ProvenanceRecord {
    return {
      documentId: input.documentId,
      parserName: input.parserName,
      parserVersion: input.parserVersion,
      normalizerVersion: input.normalizerVersion ?? '1.0.0',
      analyzerVersion: input.analyzerVersion ?? '1.0.0',
      chunkStrategyUsed: input.chunkStrategyUsed,
      embeddingModel: input.embeddingModel,
      pipelineVersion: input.pipelineVersion ?? '1.0.0',
      processedAt: new Date().toISOString(),
    };
  }
}
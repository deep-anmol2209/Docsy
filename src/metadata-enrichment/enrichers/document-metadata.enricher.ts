import type { CommonDocument } from '../../common-types/document-model';
import type { DocumentMetadata } from '../../common-types/metadata.model';
import type { AnalysisResult } from '../../analyzer/analysis-result-model';

export interface DocumentEnrichmentContext {
  readonly analysisResult: AnalysisResult;
  readonly analyzerVersion: string;
  readonly chunkCount?: number;
}

/**
 * Document Metadata Enricher
 *
 * Responsibility:
 * ----------------
 * Build/enrich DocumentMetadata combining CommonDocument and AnalysisResult.
 */
export class DocumentMetadataEnricher {
  public enrich(document: CommonDocument, context: DocumentEnrichmentContext): DocumentMetadata {
    const { analysisResult, analyzerVersion } = context;

    let pageCount: number | undefined;
    let durationSeconds: number | undefined;
    let wordCount = 0;

    for (const block of document.blocks || []) {
      if (block.page && (!pageCount || block.page > pageCount)) {
        pageCount = block.page;
      }
      if (block.endTimeSeconds && (!durationSeconds || block.endTimeSeconds > durationSeconds)) {
        durationSeconds = block.endTimeSeconds;
      }
      if (block.content) {
        wordCount += block.content.trim().split(/\s+/).length;
      }
    }

    return {
      documentId: document.documentId,
      sourceId: document.sourceId,
      documentType: analysisResult.documentType,
      isScanned: analysisResult.isScanned,
      requiresOCR: analysisResult.requiresOCR,
      structureConfidence: analysisResult.confidenceScore,
      parserName: document.provenance.parserName,
      parserVersion: document.provenance.parserVersion,
      analyzerVersion,
      pageCount,
      durationSeconds,
      wordCount,
    };
  }
}
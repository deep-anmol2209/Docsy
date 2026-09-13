import { DocumentType } from '../common-types/enums';

export type StructureClassification = 'structured' | 'semi_structured' | 'unstructured';

/**
 * Analysis Result
 *
 * Responsibility:
 * ----------------
 * Standard output returned by Analyzer for downstream pipeline consumption.
 */
export interface AnalysisResult {
  readonly documentType: DocumentType;
  readonly language?: string;
  readonly confidenceScore: number;
  readonly requiresOCR: boolean;
  readonly structureType: StructureClassification;
  readonly qualityScore: number;
  readonly isScanned: boolean;
  readonly recommendedIntermediateFormat?: 'text' | 'markdown';
  readonly formatSelectionReasoning?: readonly string[];
  readonly metadata?: Readonly<Record<string, unknown>>;
}
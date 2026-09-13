// import type { CommonDocument } from '../common-types/document-model';
// import type { AnalysisResult } from './analysis-result-model';

// /**
//  * Analyzer Contract
//  *
//  * Responsibility:
//  * ----------------
//  * Defines a common contract for every document analyzer.
//  */
// export interface DocumentAnalyzer {
//   analyze(document: CommonDocument): Promise<AnalysisResult> | AnalysisResult;
// }


import type { CommonDocument } from '../common-types/document-model';
import type { AnalysisResult } from './analysis-result-model';

/**
 * Analyzer Function Contract
 *
 * Responsibility:
 * ----------------
 * Defines the signature of any function capable of analyzing a CommonDocument.
 *
 * Rules:
 * - Pure function.
 * - No database access.
 * - No network requests.
 * - No mutations outside the provided document/context.
 * - Always returns a complete AnalysisResult.
 */
export type AnalyzeDocument = (
  document: CommonDocument
) => Promise<AnalysisResult>;
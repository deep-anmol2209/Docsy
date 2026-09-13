import type { CommonDocument } from '../common-types/document-model';
import type { AnalysisResult } from './analysis-result-model';
import { DocumentTypeDetector } from './detectors/document-type.detector';
import { LanguageDetector } from './detectors/language.detector';
import { StructureDetector } from './detectors/structure.detector';
import { ScannedVsSearchableDetector } from './detectors/scanned-vs-searchable.detector';
import { QualityDetector } from './detectors/quality.detector';
import { FormatRecommendationDetector } from './detectors/format-recommendation.detector';

const documentTypeDetector = new DocumentTypeDetector();
const languageDetector = new LanguageDetector();
const structureDetector = new StructureDetector();
const scanDetector = new ScannedVsSearchableDetector();
const qualityDetector = new QualityDetector();
const formatDetector = new FormatRecommendationDetector();

export async function analyzeDocument(document: CommonDocument): Promise<AnalysisResult> {
  const typeResult = documentTypeDetector.detect(document);
  const languageResult = languageDetector.detect(document);
  const structureResult = structureDetector.detect(document);
  const scanResult = scanDetector.detect(document);
  const qualityResult = qualityDetector.detect(document);
  const formatResult = formatDetector.detect(document, structureResult, typeResult, scanResult);

  const confidenceScore = Number(
    ((typeResult.confidence + languageResult.confidence + scanResult.confidence) / 3).toFixed(2)
  );

  return {
    documentType: typeResult.documentType,
    language: languageResult.language,
    confidenceScore,
    requiresOCR: scanResult.requiresOCR,
    structureType: structureResult.structureType,
    qualityScore: qualityResult.qualityScore,
    isScanned: scanResult.isScanned,
    recommendedIntermediateFormat: formatResult.recommendedIntermediateFormat,
    formatSelectionReasoning: formatResult.reasoning,
    metadata: {
      headingCount: structureResult.headingCount,
      tableCount: structureResult.tableCount,
      listCount: structureResult.listCount,
      codeBlockCount: structureResult.codeBlockCount,
      isMultilingual: languageResult.isMultilingual,
      garbledTextDetected: qualityResult.garbledTextDetected,
    },
  };
}
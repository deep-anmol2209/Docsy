import type { CommonDocument } from '../../common-types/document-model';

export interface LanguageDetectionOutput {
  readonly language: string; // BCP-47 tag (e.g. 'en', 'es', 'fr', 'de')
  readonly confidence: number;
  readonly isMultilingual: boolean;
}

/**
 * Language Detector
 *
 * Responsibility:
 * ----------------
 * Detect document primary language tag and confidence score.
 */
export class LanguageDetector {
  public detect(document: CommonDocument): LanguageDetectionOutput {
    // 1. Check if document already has declared/detected language
    if (document.language) {
      return {
        language: document.language,
        confidence: 0.95,
        isMultilingual: false,
      };
    }

    const fullText = (document.blocks || [])
      .map((b) => b.content)
      .join(' ')
      .slice(0, 3000)
      .toLowerCase();

    if (!fullText.trim()) {
      return { language: 'en', confidence: 0.5, isMultilingual: false };
    }

    // Common word heuristic dictionary
    const englishWords = ['the', 'and', 'is', 'in', 'to', 'of', 'that', 'for', 'with', 'on'];
    const spanishWords = ['que', 'el', 'de', 'la', 'en', 'y', 'los', 'del', 'se', 'por'];
    const frenchWords = ['les', 'des', 'que', 'du', 'une', 'dans', 'pour', 'pas', 'sur'];
    const germanWords = ['der', 'die', 'das', 'und', 'ist', 'mit', 'den', 'von', 'auf'];

    const countMatches = (words: string[]) =>
      words.reduce((acc, word) => acc + (fullText.includes(` ${word} `) ? 1 : 0), 0);

    const enScore = countMatches(englishWords);
    const esScore = countMatches(spanishWords);
    const frScore = countMatches(frenchWords);
    const deScore = countMatches(germanWords);

    const maxScore = Math.max(enScore, esScore, frScore, deScore);

    if (maxScore === 0) {
      return { language: 'en', confidence: 0.6, isMultilingual: false };
    }

    let detectedLang = 'en';
    if (maxScore === esScore) detectedLang = 'es';
    else if (maxScore === frScore) detectedLang = 'fr';
    else if (maxScore === deScore) detectedLang = 'de';

    const secondaryLangs = [enScore, esScore, frScore, deScore].filter((s) => s > 2 && s !== maxScore);
    const isMultilingual = secondaryLangs.length > 0;

    return {
      language: detectedLang,
      confidence: Math.min(0.9, 0.6 + maxScore * 0.05),
      isMultilingual,
    };
  }
}
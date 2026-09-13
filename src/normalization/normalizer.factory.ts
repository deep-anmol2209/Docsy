import type { CommonDocument } from '../common-types/document-model';
import type { Normalizer } from './normalizer.interface';
import { UnicodeNormalizer } from './unicode-normalizer';
import { WhitespaceCleaner } from './whitespace-cleaner';
import { TextNormalizer } from './text-normalizer';

/**
 * Normalizer Factory
 *
 * Responsibility:
 * ----------------
 * Build and configure the normalization pipeline.
 */
export class NormalizerFactory implements Normalizer {
  private readonly normalizers: readonly Normalizer[];

  constructor(customNormalizers?: Normalizer[]) {
    this.normalizers = customNormalizers ?? [
      new UnicodeNormalizer(),
      new WhitespaceCleaner(),
      new TextNormalizer(),
    ];
  }

  /**
   * Executes all configured normalizers in order.
   */
  public async normalize(document: CommonDocument): Promise<CommonDocument> {
    let currentDoc = document;
    for (const normalizer of this.normalizers) {
      currentDoc = await normalizer.normalize(currentDoc);
    }
    return currentDoc;
  }
}

/**
 * Helper function to create a standard normalization pipeline instance.
 */
export function createNormalizationPipeline(customNormalizers?: Normalizer[]): Normalizer {
  return new NormalizerFactory(customNormalizers);
}
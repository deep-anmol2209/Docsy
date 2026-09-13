import type { CommonDocument } from '../common-types/document-model';

/**
 * Normalizer Contract
 *
 * Responsibility:
 * ----------------
 * Defines a common contract for all normalizers.
 *
 * Purpose:
 * --------
 * Ensure every normalizer behaves consistently.
 *
 * Every normalizer MUST:
 * ----------------------
 * - Accept a CommonDocument.
 * - Normalize document content.
 * - Return updated CommonDocument.
 *
 * SHOULD NOT:
 * -----------
 * - Detect language.
 * - Perform OCR.
 * - Parse document.
 * - Chunk document.
 * - Generate embeddings.
 * - Store data.
 */
export interface Normalizer {
  normalize(document: CommonDocument): Promise<CommonDocument> | CommonDocument;
}
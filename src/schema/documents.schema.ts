import type { DocumentType } from "@/src/common-types/enums";

/**
 * Database entity
 */
export interface DocumentRecord {
  readonly id: string;
  readonly sourceId: string;
  readonly title: string;
  readonly documentType: DocumentType;
  readonly language?: string;
  readonly pageCount?: number;
  readonly durationSeconds?: number;
  readonly chunkCount: number;
  readonly parserName: string;
  readonly parserVersion: string;
  readonly analyzerVersion: string;
  readonly isScanned: boolean;
  readonly requiresOCR: boolean;
  readonly metadataSummary?: Readonly<Record<string, unknown>>;
  readonly createdAt: string;
  readonly updatedAt: string;
}

/**
 * Input for creating a document
 */
export interface CreateDocumentInput {
  readonly sourceId: string;
  readonly title: string;
  readonly documentType: DocumentType;

  readonly language?: string;
  readonly pageCount?: number;
  readonly durationSeconds?: number;

  readonly chunkCount?: number;

  readonly parserName: string;
  readonly parserVersion: string;
  readonly analyzerVersion: string;

  readonly isScanned?: boolean;
  readonly requiresOCR?: boolean;

  readonly metadataSummary?: Readonly<Record<string, unknown>>;
}
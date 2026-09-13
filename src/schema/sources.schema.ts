import type { JobState } from '@/src/common-types/enums';

/**
 * Source Record Schema
 *
 * Responsibility:
 * - Store every user uploaded knowledge source.
 * - Represents original input reference and status.
 */
export interface SourceRecord {
  readonly id: string;
  readonly workspaceId: string;
  readonly ownerUserId: string;
  readonly notebookId?: string;
  readonly content?: string;
  readonly title: string;
  readonly type?: string;
  readonly originalReference?: string;
  readonly url?: string
  readonly publicId?: string;
  readonly storageLocation?: string; // S3 key or cloudinary reference
  readonly cloudinaryPublicId?: string;
  readonly cloudinarySecureUrl?: string;
  readonly mimeType?: string;
  readonly fileSizeBytes?: number;
  readonly ingestionStatus: JobState;
  readonly uploadMetadata?: Readonly<Record<string, unknown>>;
  readonly createdAt: string;
  readonly updatedAt: string;
}

export function createSourceRecord(params: Omit<SourceRecord, 'createdAt' | 'updatedAt'>): SourceRecord {
  const now = new Date().toISOString();
  return {
    ...params,
    createdAt: now,
    updatedAt: now,
  };
}
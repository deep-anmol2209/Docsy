/**
 * Chunk Persistence Record Schema
 *
 * Responsibility:
 * - Represents optional relational/document store record for chunks.
 * - Used when human editing, annotations, or chunk versioning are enabled.
 */
export interface ChunkRecord {
  readonly id: string;
  readonly documentId: string;
  readonly sourceId: string;
  readonly order: number;
  readonly content: string;
  readonly strategy: string;
  readonly page?: number;
  readonly heading?: string;
  readonly section?: string;
  readonly startTimeSeconds?: number;
  readonly endTimeSeconds?: number;
  readonly slideNumber?: number;
  readonly storageLocation?: string; // S3 object reference if stored externally
  readonly createdAt: string;
  readonly updatedAt: string;
}

export function createChunkRecord(params: Omit<ChunkRecord, 'createdAt' | 'updatedAt'>): ChunkRecord {
  const now = new Date().toISOString();
  return {
    ...params,
    createdAt: now,
    updatedAt: now,
  };
}
/**
 * Notebook Record Schema
 *
 * Responsibility:
 * - Represents a user notebook container.
 * - Each user can have many notebooks.
 * - Each notebook contains multiple knowledge sources.
 */
export interface NotebookRecord {
  readonly id: string;
  readonly title: string;
  readonly description?: string;
  readonly ownerUserId: string;
  readonly createdAt: string;
  readonly updatedAt: string;
}

export function createNotebookRecord(params: Omit<NotebookRecord, 'createdAt' | 'updatedAt'>): NotebookRecord {
  const now = new Date().toISOString();
  return {
    ...params,
    createdAt: now,
    updatedAt: now,
  };
}

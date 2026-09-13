import type { SourceMetadata } from '../../common-types/metadata.model';
import type { SourceInput } from '../../common-types/source-model';
import { SourceInputKind, JobState } from '../../common-types/enums';

/**
 * Source Metadata Enricher
 *
 * Responsibility:
 * ----------------
 * Build/enrich SourceMetadata from SourceInput payloads.
 */
export class SourceMetadataEnricher {
  public enrich(sourceId: string, input: SourceInput): SourceMetadata {
    const now = new Date().toISOString();
    let originalReference: string | undefined;

    if (input.inputKind === SourceInputKind.FILE) {
      originalReference = input.fileName || input.storageKey;
    } else if (input.inputKind === SourceInputKind.URL) {
      originalReference = input.url;
    }

    const title = input.title || (input.inputKind === SourceInputKind.FILE ? input.fileName : input.type);

    return {
      sourceId,
      sourceType: input.type,
      title,
      createdAt: now,
      updatedAt: now,
      originalReference,
      ownerUserId: input.ownerUserId,
      workspaceId: input.workspaceId,
      ingestionStatus: JobState.QUEUED,
    };
  }
}
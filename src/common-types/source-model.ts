import { SourceInputKind } from './enums';
import type { SourceMetadata } from './metadata.model';

/**
 * source-model.ts
 *
 * The Source entity plus the discriminated-union input payloads accepted when a user
 * adds a source from the frontend. Adding a new source type means adding one new
 * member to the `SourceInput` union (and one `SourceTypeDefinition` in the registry) -
 * every existing member of the union, and every existing consumer of `SourceInput`,
 * is left untouched.
 */

export interface Source {
  readonly metadata: SourceMetadata;
}

interface BaseSourceInput {
  readonly type: string;
  readonly workspaceId: string;
  readonly ownerUserId: string;
  /** User-supplied display title. When omitted, the pipeline derives one during parsing
   *  (e.g. the PDF's title metadata, the video's title, the first Markdown heading). */
  readonly title?: string;
}

/** Input for sources supplied as an already-uploaded file (e.g. PDF). */
export interface FileSourceInput extends BaseSourceInput {
  readonly inputKind: SourceInputKind.FILE;
  /** Object-storage key of the raw file, obtained from the presigned-upload flow. */
  readonly storageKey: string;
  readonly mimeType: string;
  readonly fileName: string;
  readonly fileSizeBytes: number;
}

/** Input for sources supplied as a URL to be fetched (e.g. YouTube, webpage). */
export interface UrlSourceInput extends BaseSourceInput {
  readonly inputKind: SourceInputKind.URL;
  readonly url: string;
}

/** Input for sources supplied as raw text pasted by the user (e.g. plain text, Markdown). */
export interface RawTextSourceInput extends BaseSourceInput {
  readonly inputKind: SourceInputKind.RAW_TEXT;
  readonly text: string;
}

/**
 * Discriminated union covering every way a source can be supplied today. New input
 * shapes (e.g. an OAuth-based Notion or Google Docs input) extend this union
 * additively; existing branches and every exhaustive `switch` over `inputKind` remain
 * valid and are simply extended by the compiler at the new call sites.
 */
export type SourceInput = FileSourceInput | UrlSourceInput | RawTextSourceInput;
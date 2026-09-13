// import type { CommonDocument } from '../common-types/document-model';

// /**
//  * Document Parser Contract
//  *
//  * Responsibility:
//  * ----------------
//  * Defines a common contract that every parser MUST implement.
//  *
//  * Inputs:
//  * -------
//  * Parser input payload (e.g. sourceId, file buffer, text, URL).
//  *
//  * Output:
//  * -------
//  * CommonDocument shape.
//  */



import type { CommonDocument } from '../common-types/document-model';
export interface DocumentParser<TInput = any> {
  parse(input: TInput): Promise<CommonDocument>;
}

/**
 * parser.interface.ts
 *
 * The one shape every parser accepts, and the one shape every parser returns. This is
 * what lets `ParsingStage` stay completely source-type-agnostic: it builds exactly one
 * `ParseRequest` per source - regardless of type - and hands it to whichever `Parser`
 * the registry resolves. It never branches on source type to build a different input
 * shape, and it never fetches/downloads anything itself.
 *
 * Every field below is optional except the identity fields, because different source
 * types populate different subsets: a PDF parser reads `storageLocation` and downloads
 * its own bytes; a YouTube/webpage parser reads `url` and fetches it directly; a Text
 * parser reads `inlineText` when present or falls back to `storageLocation`. Each
 * parser is responsible for validating that the fields *it* needs are present, and for
 * resolving them into actual content - `ParsingStage` never does this on a parser's
 * behalf.
 */
export interface ParseRequest {
  readonly sourceId: string;
  readonly documentId: string;
  readonly sourceType: string;

  readonly title?: string;
  readonly language?: string;

  /** Object-storage reference (e.g. "supabase://bucket/key"), for file-based sources
   *  (PDF today; DOCX/PPTX/EPUB later). Parsers that need bytes resolve this themselves. */
  readonly storageLocation?: string;
  readonly cloudinaryPublicId?: string;
  readonly cloudinarySecureUrl?: string;

  /** A URL to fetch, for URL-based sources (YouTube, webpage, and future sources such
   *  as a GitHub repo or a Notion page). */
  readonly url?: string;

  /** Text supplied directly by the user, for raw-text/Markdown sources. */
  readonly inlineText?: string;

  /** Free-form pass-through bag for upstream stage output that a specific parser may
   *  care about (e.g. a pre-parse page-classification hint used only by the PDF
   *  parser). `ParsingStage` never reads or interprets this - only forwards it - so a
   *  future source type adding its own key here never requires a `ParsingStage` change. */
  readonly processingMetadata?: Readonly<Record<string, unknown>>;
}

/** Implemented by every format-specific parser (PDF, YouTube, Text, Markdown, Webpage,
 *  and any future source type registered in the Parser Registry). */
export interface Parser {
  parse(request: ParseRequest): Promise<CommonDocument>;
}
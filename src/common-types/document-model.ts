import { BlockType } from './enums';

/**
 * document-model.ts
 *
 * The Common Document Model (CDM) - the single shape every parser must produce,
 * regardless of source type. Everything downstream of parsing (normalization,
 * analysis, chunking) depends only on this shape, never on source-specific structure.
 * This is the contract that makes adding a new parser a purely additive change.
 */

/** A single structural unit of a document (a paragraph, a heading, a slide, a transcript segment, ...). */
export interface DocumentBlock {
  /** Stable identifier, unique within the parent document. */
  readonly id: string;

  /** What kind of structural unit this block represents. */
  readonly type: BlockType;

  /** Plain-text content of the block. Always present, even for non-text blocks (e.g. image alt text). */
  readonly content: string;

  /** Zero-based position of this block within the document's overall block sequence. */
  readonly order: number;

  /** 1-based page number, present when the source has a paginated structure (PDF, DOCX, EPUB, ...). */
  readonly page?: number;

  /** Heading depth (1 = title/H1, 2 = H2, ...). Present only when `type === BlockType.HEADING`. */
  readonly headingLevel?: number;

  /** Slide number. Present only for slide-based sources (PPTX). */
  readonly slideNumber?: number;

  /** Inclusive start time in seconds. Present only for time-based sources (YouTube, audio). */
  readonly startTimeSeconds?: number;

  /** Exclusive end time in seconds. Present only for time-based sources (YouTube, audio). */
  readonly endTimeSeconds?: number;

  /** Speaker/author label for this block, when diarization or per-block authorship is known. */
  readonly speaker?: string;

  /** BCP-47 language tag for this specific block, when it differs from the document's primary language. */
  readonly language?: string;

  /** BCP-47 language tags for this block, for parsers that can detect more than one
   *  language per element (e.g. Unstructured's `languages` array). Prefer this over the
   *  singular `language` field when a block may genuinely be multilingual; parsers that
   *  only ever detect one language can keep using `language` and leave this unset. */
  readonly languages?: readonly string[];

  /** ID of this block's structural parent (e.g. the heading a paragraph or table sits
   *  under). Optional because not every source format exposes a hierarchy - e.g. plain
   *  text and simple Markdown blocks are typically flat - but parsers that do have this
   *  signal (such as Unstructured's `parent_id` for PDFs) should populate it, since
   *  heading-based and research-paper chunk strategies rely on it to keep related
   *  content grouped together. */
  readonly parentId?: string;

  /** Structured HTML representation of this block's content, populated only when a
   *  flattened plain-text `content` would lose meaningful structure - most notably for
   *  `BlockType.TABLE` blocks, where row/column alignment cannot survive as plain text
   *  (e.g. Unstructured's `text_as_html`). Absent for block types where `content` alone
   *  is already a faithful representation. */
  readonly htmlContent?: string;

  /** Opaque, parser-specific metadata for this individual block - e.g. an extraction
   *  confidence flag or the extraction method used for a table (Unstructured's
   *  `is_extracted`, `table_extraction_method`). Mirrors `CommonDocument.nativeMetadata`
   *  but at block granularity; consumers should not depend on its internal shape, only
   *  pass it through or read specific known keys when debugging a particular parser. */
  readonly nativeMetadata?: Readonly<Record<string, unknown>>;
}

/** Provenance of a parsed document - enables safe partial re-ingestion when a parser is upgraded. */
export interface DocumentProvenance {
  readonly parserName: string;
  readonly parserVersion: string;
  /** ISO-8601 timestamp of when parsing completed. */
  readonly parsedAt: string;
}

/**
 * The Common Document Model.
 *
 * Every `Parser` implementation (PDF, YouTube, Text, Markdown, Webpage, and any future
 * source type) must produce exactly this shape. Downstream stages (Normalization,
 * Analysis, Chunking) are written once against this interface and never need to know
 * which parser produced a given document.
 */
export interface CommonDocument {
  readonly documentId: string;
  readonly sourceId: string;
  readonly sourceType: string;

  /** Ordered structural units making up the document's content. */
  readonly blocks: readonly DocumentBlock[];

  /** Best-effort primary language of the whole document (BCP-47), detected or declared. */
  readonly language?: string;

  /** Native, source-specific metadata that doesn't fit the common shape. Kept opaque downstream -
   *  consumers should not depend on its internal structure, only pass it through or read known keys. */
  readonly nativeMetadata: Readonly<Record<string, unknown>>;

  readonly provenance: DocumentProvenance;
}
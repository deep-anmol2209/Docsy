/**
 * Plain Text Parser
 *
 * Responsibility:
 * ----------------
 * Convert plain text into CommonDocument.
 *
 * Implements the unified `Parser` interface so `ParsingStage` can dispatch to it
 * via the `ParserRegistry` for `KNOWN_SOURCE_TYPES.TEXT`. Content is resolved
 * from `request.inlineText` (user-pasted text) or, if absent, from
 * `request.storageLocation` (downloaded by the parser itself via SupabaseStorageAdapter).
 */

import { BlockType, KNOWN_SOURCE_TYPES } from '../../common-types/enums';
import type { CommonDocument } from '../../common-types/document-model';
import type { Parser, ParseRequest } from '../parser-interface';
import { SupabaseStorageAdapter } from '../../storage/adapters/supabase.adapter';

export class TextParser implements Parser {
  private readonly storageAdapter: SupabaseStorageAdapter;

  constructor(storageAdapter?: SupabaseStorageAdapter) {
    this.storageAdapter = storageAdapter ?? new SupabaseStorageAdapter();
  }

  /**
   * Implements `Parser.parse`. Resolves content from `request.inlineText` first;
   * falls back to downloading from `request.storageLocation` when the text was
   * uploaded as a file rather than pasted inline.
   */
  public async parse(request: ParseRequest): Promise<CommonDocument> {
    const { sourceId, documentId, title, language } = request;

    if (!sourceId) {
      throw new Error('[TextParser] TextParser requires a valid sourceId.');
    }

    const rawText = await this.resolveText(request);

    console.log(`[TEXT PARSER] 📝 Parsing plain text (${rawText.length} chars) for source "${sourceId}"`);

    // Split text by double newlines into distinct paragraph blocks
    const paragraphs = rawText
      .split(/\n\s*\n/)
      .map((p) => p.trim())
      .filter((p) => p.length > 0);

    const blocks = (paragraphs.length > 0 ? paragraphs : [rawText]).map((content, index) => {
      const isHeading =
        content.length < 60 && !content.endsWith('.') && /^[A-Z0-9\s•\-:]{3,60}$/.test(content);
      const isBullet = /^[•\-\*]\s/.test(content) || /^\d+\.\s/.test(content);

      return {
        id: `text-block-${index}`,
        type: isHeading
          ? BlockType.HEADING
          : isBullet
          ? BlockType.LIST_ITEM
          : BlockType.PARAGRAPH,
        content,
        order: index,
        headingLevel: isHeading ? 2 : undefined,
      };
    });

    const resolvedDocumentId = documentId ?? `doc-text-${sourceId}`;

    console.log(`[TEXT PARSER] ✅ Built ${blocks.length} blocks for source "${sourceId}"`);

    return {
      documentId: resolvedDocumentId,
      sourceId,
      sourceType: KNOWN_SOURCE_TYPES.TEXT,
      blocks,
      language: language ?? 'en',
      nativeMetadata: {
        title: title || 'Plain Text Document',
        blockCount: blocks.length,
        characterCount: rawText.length,
      },
      provenance: {
        parserName: 'TextParser',
        parserVersion: '2.0.0',
        parsedAt: new Date().toISOString(),
      },
    };
  }

  /**
   * Resolves raw text in priority order:
   * 1. `inlineText` — user pasted the text directly (no download needed).
   * 2. `storageLocation` — text was uploaded as a file; download and decode.
   */
  private async resolveText(request: ParseRequest): Promise<string> {
    if (request.inlineText && request.inlineText.trim().length > 0) {
      return request.inlineText;
    }

    if (request.storageLocation) {
      try {
        const objectKey = request.storageLocation.replace(/^supabase:\/\/[^/]+\//, '');
        const buffer = await this.storageAdapter.download(objectKey);
        const text = buffer.toString('utf-8');
        if (text.trim().length > 0) {
          return text;
        }
      } catch (err) {
        console.error(
          `[TextParser] Failed to download text from storage for source "${request.sourceId}":`,
          err
        );
      }
    }

    // Graceful degradation: use title as fallback content
    return request.title || `Empty source for ${request.sourceId}`;
  }
}
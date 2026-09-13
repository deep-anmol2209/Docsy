/**
 * Markdown Parser
 *
 * Responsibility:
 * ----------------
 * Convert Markdown text into a structured CommonDocument, preserving heading
 * hierarchy, code blocks, lists, blockquotes, and paragraphs as typed blocks.
 *
 * Implements the unified `Parser` interface so `ParsingStage` can dispatch to it
 * via the `ParserRegistry` for `KNOWN_SOURCE_TYPES.MARKDOWN`. Content is resolved
 * from `request.inlineText` or downloaded from `request.storageLocation`.
 */

import { BlockType, KNOWN_SOURCE_TYPES } from '../../common-types/enums';
import type { CommonDocument, DocumentBlock } from '../../common-types/document-model';
import type { Parser, ParseRequest } from '../parser-interface';
import { SupabaseStorageAdapter } from '../../storage/adapters/supabase.adapter';

export class MarkdownParser implements Parser {
  private readonly storageAdapter: SupabaseStorageAdapter;

  constructor(storageAdapter?: SupabaseStorageAdapter) {
    this.storageAdapter = storageAdapter ?? new SupabaseStorageAdapter();
  }

  /**
   * Implements `Parser.parse`. Resolves content from `request.inlineText` first;
   * falls back to downloading from `request.storageLocation`.
   */
  public async parse(request: ParseRequest): Promise<CommonDocument> {
    const { sourceId, documentId, title, language } = request;

    if (!sourceId) {
      throw new Error('[MarkdownParser] MarkdownParser requires a valid sourceId.');
    }

    const markdownText = await this.resolveMarkdown(request);

    console.log(
      `[MARKDOWN PARSER] 📝 Parsing Markdown (${markdownText.length} chars) for source "${sourceId}"`
    );

    const blocks = this.parseMarkdownToBlocks(markdownText);
    const resolvedDocumentId = documentId ?? `doc-md-${sourceId}`;

    console.log(`[MARKDOWN PARSER] ✅ Built ${blocks.length} blocks for source "${sourceId}"`);

    return {
      documentId: resolvedDocumentId,
      sourceId,
      sourceType: KNOWN_SOURCE_TYPES.MARKDOWN,
      blocks,
      language: language ?? 'en',
      nativeMetadata: {
        title: title || this.extractTitle(markdownText) || 'Markdown Document',
        blockCount: blocks.length,
        characterCount: markdownText.length,
      },
      provenance: {
        parserName: 'MarkdownParser',
        parserVersion: '1.0.0',
        parsedAt: new Date().toISOString(),
      },
    };
  }

  /**
   * Resolves markdown content in priority order:
   * 1. `inlineText` — user pasted the markdown directly.
   * 2. `storageLocation` — markdown was uploaded as a file; download and decode.
   */
  private async resolveMarkdown(request: ParseRequest): Promise<string> {
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
          `[MarkdownParser] Failed to download markdown from storage for source "${request.sourceId}":`,
          err
        );
      }
    }

    return request.title || `Empty markdown source for ${request.sourceId}`;
  }

  /**
   * Parses raw markdown text into an array of typed `DocumentBlock`s.
   *
   * Strategy — line-by-line state machine:
   * - ATX headings (`# … ######`)      → HEADING  (headingLevel 1-6)
   * - Fenced code blocks (``` … ```)   → CODE_BLOCK
   * - Blockquotes (`> …`)              → QUOTE
   * - Unordered list items (`- / * / +`) → LIST_ITEM
   * - Ordered list items (`1. …`)       → LIST_ITEM
   * - Horizontal rules                 → skipped (structural separator)
   * - Everything else                  → PARAGRAPH (blank lines flush paragraphs)
   */
  private parseMarkdownToBlocks(markdown: string): DocumentBlock[] {
    const lines = markdown.split('\n');
    const blocks: DocumentBlock[] = [];
    let order = 0;
    let insideCodeBlock = false;
    let codeFence = '';
    let codeLang = '';
    let codeLines: string[] = [];
    let paragraphLines: string[] = [];

    const flushParagraph = () => {
      if (paragraphLines.length === 0) return;
      const content = paragraphLines.join('\n').trim();
      if (content.length > 0) {
        blocks.push({
          id: `md-block-${order}`,
          type: BlockType.PARAGRAPH,
          content,
          order: order++,
        });
      }
      paragraphLines = [];
    };

    const flushCodeBlock = () => {
      const content = codeLines.join('\n').trim();
      if (content.length > 0) {
        blocks.push({
          id: `md-block-${order}`,
          type: BlockType.CODE_BLOCK,
          content,
          order: order++,
          nativeMetadata: codeLang ? { language: codeLang } : undefined,
        });
      }
      codeLines = [];
      codeLang = '';
    };

    for (const line of lines) {
      // --- Code fence detection ---
      const fenceMatch = line.match(/^(`{3,}|~{3,})(.*)?$/);
      if (fenceMatch && !insideCodeBlock) {
        flushParagraph();
        insideCodeBlock = true;
        codeFence = fenceMatch[1];
        codeLang = (fenceMatch[2] ?? '').trim();
        continue;
      }
      if (insideCodeBlock) {
        if (line.startsWith(codeFence)) {
          insideCodeBlock = false;
          flushCodeBlock();
        } else {
          codeLines.push(line);
        }
        continue;
      }

      // --- ATX Heading ---
      const headingMatch = line.match(/^(#{1,6})\s+(.*)/);
      if (headingMatch) {
        flushParagraph();
        const level = headingMatch[1].length;
        const content = headingMatch[2].trim();
        if (content.length > 0) {
          blocks.push({
            id: `md-block-${order}`,
            type: BlockType.HEADING,
            content,
            headingLevel: level,
            order: order++,
          });
        }
        continue;
      }

      // --- Horizontal rule (skip) ---
      if (/^[-*_]{3,}\s*$/.test(line)) {
        flushParagraph();
        continue;
      }

      // --- Blockquote ---
      const quoteMatch = line.match(/^>\s?(.*)/);
      if (quoteMatch) {
        flushParagraph();
        const content = quoteMatch[1].trim();
        if (content.length > 0) {
          blocks.push({
            id: `md-block-${order}`,
            type: BlockType.QUOTE,
            content,
            order: order++,
          });
        }
        continue;
      }

      // --- Unordered list item ---
      const ulMatch = line.match(/^[\s]*[-*+]\s+(.*)/);
      if (ulMatch) {
        flushParagraph();
        const content = ulMatch[1].trim();
        if (content.length > 0) {
          blocks.push({
            id: `md-block-${order}`,
            type: BlockType.LIST_ITEM,
            content,
            order: order++,
          });
        }
        continue;
      }

      // --- Ordered list item ---
      const olMatch = line.match(/^[\s]*\d+[.)]\s+(.*)/);
      if (olMatch) {
        flushParagraph();
        const content = olMatch[1].trim();
        if (content.length > 0) {
          blocks.push({
            id: `md-block-${order}`,
            type: BlockType.LIST_ITEM,
            content,
            order: order++,
          });
        }
        continue;
      }

      // --- Blank line: flush accumulated paragraph ---
      if (line.trim() === '') {
        flushParagraph();
        continue;
      }

      // --- Regular line → accumulate into paragraph ---
      paragraphLines.push(line);
    }

    // Flush any remaining content
    flushParagraph();
    if (insideCodeBlock) {
      flushCodeBlock();
    }

    return blocks;
  }

  /** Extracts the first H1 heading from the markdown as the document title. */
  private extractTitle(markdown: string): string | undefined {
    const match = markdown.match(/^#\s+(.+)/m);
    return match ? match[1].trim() : undefined;
  }
}

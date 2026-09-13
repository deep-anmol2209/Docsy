/**
 * Markdown Converter
 *
 * Responsibility:
 * ----------------
 * Convert a CommonDocument into readable Markdown.
 *
 * This class intentionally does NOT:
 * - Decide whether Markdown conversion is needed.
 * - Parse documents.
 * - Chunk documents.
 * - Store artifacts.
 *
 * Those responsibilities belong to the pipeline stages.
 */

import type { CommonDocument } from '@/src/common-types/document-model';

export interface MarkdownConverter {
  convert(document: CommonDocument): Promise<string>;
}

export class DefaultMarkdownConverter implements MarkdownConverter {
  async convert(document: CommonDocument): Promise<string> {
    if (!document) {
      throw new Error('[MarkdownConverter] Document is required');
    }

    const sections: string[] = [];

    // ---------------------------------------------------------
    // Document title
    // ---------------------------------------------------------

    const title = this.extractTitle(document);

    if (title) {
      sections.push(`# ${this.cleanInlineMarkdown(title)}`);
    }

    // ---------------------------------------------------------
    // Document metadata
    // ---------------------------------------------------------

    const metadata = this.extractMetadata(document);

    if (metadata.length > 0) {
      sections.push(metadata.join('\n'));
    }

    // ---------------------------------------------------------
    // Document content
    // ---------------------------------------------------------

    const content = this.extractContent(document);

    if (content) {
      sections.push(content);
    }

    // ---------------------------------------------------------
    // Final output
    // ---------------------------------------------------------

    const markdown = sections
      .map((section) => section.trim())
      .filter(Boolean)
      .join('\n\n');

    if (!markdown.trim()) {
      throw new Error(
        '[MarkdownConverter] Unable to generate Markdown: document contains no readable content'
      );
    }

    return `${markdown.trim()}\n`;
  }

  // ============================================================
  // Title
  // ============================================================

  private extractTitle(document: CommonDocument): string | null {
    const doc = document as Record<string, unknown>;

    const possibleTitles = [
      doc.title,
      doc.name,
      doc.fileName,
      doc.filename,
      doc.sourceName,
    ];

    for (const value of possibleTitles) {
      if (typeof value === 'string' && value.trim()) {
        return value.trim();
      }
    }

    return null;
  }

  // ============================================================
  // Metadata
  // ============================================================

  private extractMetadata(document: CommonDocument): string[] {
    const doc = document as Record<string, unknown>;

    const metadata: string[] = [];

    const sourceType = this.readString(doc.sourceType);

    if (sourceType) {
      metadata.push(`> **Source Type:** ${sourceType}`);
    }

    const documentId = this.readString(doc.documentId);

    if (documentId) {
      metadata.push(`> **Document ID:** ${documentId}`);
    }

    const sourceUrl = this.readString(
      doc.sourceUrl ?? doc.url ?? doc.source
    );

    if (sourceUrl) {
      metadata.push(`> **Source:** ${sourceUrl}`);
    }

    return metadata;
  }

  // ============================================================
  // Content
  // ============================================================

  private extractContent(document: CommonDocument): string {
    const doc = document as Record<string, unknown>;

    /*
     * CommonDocument implementations can differ depending on
     * parser/source. We therefore support the common shapes:
     *
     * - blocks
     * - content
     * - text
     * - pages
     * - sections
     */

    if (Array.isArray(doc.blocks)) {
      return this.convertBlocks(doc.blocks);
    }

    if (Array.isArray(doc.sections)) {
      return this.convertSections(doc.sections);
    }

    if (Array.isArray(doc.pages)) {
      return this.convertPages(doc.pages);
    }

    if (typeof doc.content === 'string') {
      return this.convertPlainText(doc.content);
    }

    if (typeof doc.text === 'string') {
      return this.convertPlainText(doc.text);
    }

    return '';
  }

  // ============================================================
  // Blocks
  // ============================================================

  private convertBlocks(blocks: unknown[]): string {
    const output: string[] = [];

    for (const block of blocks) {
      if (!block || typeof block !== 'object') {
        continue;
      }

      const item = block as Record<string, unknown>;

      const type = this.readString(
        item.type ??
          item.blockType ??
          item.kind ??
          item.contentType
      )?.toLowerCase();

      const text = this.extractBlockText(item);

      switch (type) {
        case 'heading':
        case 'header':
        case 'title': {
          if (text) {
            const level = this.getHeadingLevel(item);
            output.push(`${'#'.repeat(level)} ${text}`);
          }
          break;
        }

        case 'h1':
          if (text) {
            output.push(`# ${text}`);
          }
          break;

        case 'h2':
          if (text) {
            output.push(`## ${text}`);
          }
          break;

        case 'h3':
          if (text) {
            output.push(`### ${text}`);
          }
          break;

        case 'h4':
          if (text) {
            output.push(`#### ${text}`);
          }
          break;

        case 'paragraph':
        case 'text':
        case 'body':
        case 'content':
        case 'plain_text': {
          if (text) {
            output.push(text);
          }
          break;
        }

        case 'bullet':
        case 'bullet_list':
        case 'list_item':
        case 'unordered_list': {
          if (text) {
            output.push(`- ${text}`);
          }
          break;
        }

        case 'numbered':
        case 'numbered_list':
        case 'ordered_list': {
          if (text) {
            output.push(`1. ${text}`);
          }
          break;
        }

        case 'quote':
        case 'blockquote': {
          if (text) {
            const quote = text
              .split('\n')
              .map((line) => `> ${line}`)
              .join('\n');

            output.push(quote);
          }
          break;
        }

        case 'code':
        case 'code_block':
        case 'preformatted': {
          if (text) {
            const language = this.readString(
              item.language ?? item.lang
            ) ?? '';

            output.push(
              `\`\`\`${language}\n${text}\n\`\`\``
            );
          }
          break;
        }

        case 'table': {
          const table = this.convertTable(item);

          if (table) {
            output.push(table);
          }

          break;
        }

        case 'image':
        case 'figure': {
          const image = this.convertImage(item);

          if (image) {
            output.push(image);
          }

          break;
        }

        case 'page_break': {
          output.push('---');
          break;
        }

        default: {
          /*
           * Unknown blocks are still preserved as text instead
           * of silently dropping their content.
           */
          if (text) {
            output.push(text);
          }
        }
      }
    }

    return this.normalizeMarkdown(output.join('\n\n'));
  }

  // ============================================================
  // Sections
  // ============================================================

  private convertSections(sections: unknown[]): string {
    const output: string[] = [];

    for (const section of sections) {
      if (!section || typeof section !== 'object') {
        continue;
      }

      const item = section as Record<string, unknown>;

      const title = this.readString(
        item.title ?? item.heading ?? item.name
      );

      if (title) {
        output.push(`## ${this.cleanInlineMarkdown(title)}`);
      }

      if (Array.isArray(item.blocks)) {
        output.push(this.convertBlocks(item.blocks));
        continue;
      }

      const text = this.extractBlockText(item);

      if (text) {
        output.push(text);
      }
    }

    return this.normalizeMarkdown(output.join('\n\n'));
  }

  // ============================================================
  // Pages
  // ============================================================

  private convertPages(pages: unknown[]): string {
    const output: string[] = [];

    pages.forEach((page, index) => {
      if (!page || typeof page !== 'object') {
        return;
      }

      const item = page as Record<string, unknown>;

      const pageNumber =
        typeof item.pageNumber === 'number'
          ? item.pageNumber
          : index + 1;

      if (index > 0) {
        output.push('---');
      }

      output.push(`## Page ${pageNumber}`);

      if (Array.isArray(item.blocks)) {
        output.push(this.convertBlocks(item.blocks));
        return;
      }

      const text = this.extractBlockText(item);

      if (text) {
        output.push(text);
      }
    });

    return this.normalizeMarkdown(output.join('\n\n'));
  }

  // ============================================================
  // Block text extraction
  // ============================================================

  private extractBlockText(
    block: Record<string, unknown>
  ): string {
    const possibleValues = [
      block.text,
      block.content,
      block.value,
      block.rawText,
      block.markdown,
      block.html,
    ];

    for (const value of possibleValues) {
      if (typeof value === 'string' && value.trim()) {
        return this.cleanText(value);
      }
    }

    /*
     * Some parsers may store text inside:
     *
     * {
     *   content: {
     *     text: "..."
     *   }
     * }
     */

    if (
      block.content &&
      typeof block.content === 'object'
    ) {
      const content = block.content as Record<string, unknown>;

      const nestedText = [
        content.text,
        content.value,
        content.rawText,
        content.markdown,
      ];

      for (const value of nestedText) {
        if (typeof value === 'string' && value.trim()) {
          return this.cleanText(value);
        }
      }
    }

    return '';
  }

  // ============================================================
  // Tables
  // ============================================================

  private convertTable(
    block: Record<string, unknown>
  ): string {
    const rows = block.rows;

    if (!Array.isArray(rows) || rows.length === 0) {
      return '';
    }

    const parsedRows: string[][] = [];

    for (const row of rows) {
      if (Array.isArray(row)) {
        parsedRows.push(
          row.map((cell) => this.extractCellText(cell))
        );

        continue;
      }

      if (row && typeof row === 'object') {
        const rowObject = row as Record<string, unknown>;

        const cells =
          rowObject.cells ??
          rowObject.columns ??
          rowObject.values;

        if (Array.isArray(cells)) {
          parsedRows.push(
            cells.map((cell) => this.extractCellText(cell))
          );
        }
      }
    }

    if (parsedRows.length === 0) {
      return '';
    }

    const columnCount = Math.max(
      ...parsedRows.map((row) => row.length)
    );

    if (columnCount === 0) {
      return '';
    }

    const normalizedRows = parsedRows.map((row) => {
      const copy = [...row];

      while (copy.length < columnCount) {
        copy.push('');
      }

      return copy;
    });

    const header = normalizedRows[0];

    const separator = header.map(() => '---');

    const lines = [
      `| ${header.join(' | ')} |`,
      `| ${separator.join(' | ')} |`,
    ];

    for (const row of normalizedRows.slice(1)) {
      lines.push(`| ${row.join(' | ')} |`);
    }

    return lines.join('\n');
  }

  private extractCellText(cell: unknown): string {
    if (typeof cell === 'string') {
      return this.cleanInlineMarkdown(cell);
    }

    if (typeof cell === 'number') {
      return String(cell);
    }

    if (cell && typeof cell === 'object') {
      const item = cell as Record<string, unknown>;

      const value =
        item.text ??
        item.content ??
        item.value ??
        item.name;

      if (typeof value === 'string') {
        return this.cleanInlineMarkdown(value);
      }

      if (typeof value === 'number') {
        return String(value);
      }
    }

    return '';
  }

  // ============================================================
  // Images
  // ============================================================

  private convertImage(
    block: Record<string, unknown>
  ): string {
    const url = this.readString(
      block.url ??
        block.src ??
        block.imageUrl
    );

    if (!url) {
      return '';
    }

    const alt =
      this.readString(
        block.alt ??
          block.caption ??
          block.description
      ) ?? 'Image';

    return `![${this.cleanInlineMarkdown(alt)}](${url})`;
  }

  // ============================================================
  // Heading level
  // ============================================================

  private getHeadingLevel(
    block: Record<string, unknown>
  ): number {
    const level = block.level;

    if (typeof level === 'number') {
      return Math.min(Math.max(Math.floor(level), 1), 6);
    }

    const depth = block.depth;

    if (typeof depth === 'number') {
      return Math.min(Math.max(Math.floor(depth), 1), 6);
    }

    return 2;
  }

  // ============================================================
  // Plain text
  // ============================================================

  private convertPlainText(text: string): string {
    return this.normalizeMarkdown(this.cleanText(text));
  }

  // ============================================================
  // String helpers
  // ============================================================

  private readString(value: unknown): string | null {
    if (typeof value !== 'string') {
      return null;
    }

    const trimmed = value.trim();

    return trimmed.length > 0 ? trimmed : null;
  }

  // ============================================================
  // Text cleaning
  // ============================================================

  private cleanText(text: string): string {
    return text
      .replace(/\r\n/g, '\n')
      .replace(/\r/g, '\n')
      .replace(/[ \t]+\n/g, '\n')
      .replace(/\n{3,}/g, '\n\n')
      .trim();
  }

  private cleanInlineMarkdown(text: string): string {
    return text
      .replace(/\r\n/g, ' ')
      .replace(/\r/g, ' ')
      .replace(/\n+/g, ' ')
      .replace(/\|/g, '\\|')
      .trim();
  }

  private normalizeMarkdown(markdown: string): string {
    return markdown
      .replace(/\r\n/g, '\n')
      .replace(/\r/g, '\n')
      .replace(/[ \t]+\n/g, '\n')
      .replace(/\n{3,}/g, '\n\n')
      .trim();
  }
}
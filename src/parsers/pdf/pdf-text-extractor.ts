import { BlockType } from '../../common-types/enums';
import type { DocumentBlock } from '../../common-types/document-model';

export interface PdfExtractedPage {
  readonly pageNumber: number;
  readonly text: string;
}

export interface PdfExtractionResult {
  readonly pages: readonly PdfExtractedPage[];
  readonly blocks: readonly DocumentBlock[];
  readonly pageCount: number;
  readonly metadata?: Readonly<Record<string, unknown>>;
}

function isTableLine(line: string): boolean {
  const trimmed = line.trim();
  if (!trimmed) return false;

  if (/[,.;!?]$/.test(trimmed)) return false;
  if (trimmed.includes('|')) return true;
  if (/\t|\s{2,}/.test(trimmed)) return true;

  const tokens = trimmed.split(/\s+/);
  if (tokens.length >= 3) {
    const looksLikeHeader = /^(Exercise|Duration|Benefit|Item|Quantity|Qty|Price|Total|Name|Date|Status|Category|Type|Description|Value|Amount)\b/i.test(trimmed);
    const hasNumOrUnit = /\b\d+\s*(min|sec|hr|hrs|kg|lb|\$|%|days|weeks|months|yr|years)\b/i.test(trimmed);
    if (looksLikeHeader || (hasNumOrUnit && tokens.length <= 10)) return true;
  }

  return false;
}

function isHeadingLine(line: string): boolean {
  const trimmed = line.trim();
  if (trimmed.length < 3 || trimmed.length > 70) return false;

  if (/[,.;:!?]$/.test(trimmed)) return false;
  if (/^(Chapter|Section|Part|\d+(\.\d+)*)\b/i.test(trimmed)) return true;

  if (
    /^(TECHNICAL SKILLS|PROJECTS|EXPERIENCE|EDUCATION|PROFILE|BENEFITS|OVERVIEW|SUMMARY|SPECIFICATIONS|FEATURES)/i.test(
      trimmed
    )
  ) {
    return true;
  }

  const words = trimmed.split(/\s+/);
  if (words.length <= 8 && /^[A-Z0-9]/.test(trimmed)) {
    const capitalizedWords = words.filter((w) => /^[A-Z0-9]/.test(w));
    if (capitalizedWords.length / words.length >= 0.5) {
      return true;
    }
  }

  return false;
}

export function extractPdfTextFromPages(rawPages: readonly PdfExtractedPage[]): PdfExtractionResult {
  const pages: PdfExtractedPage[] = [];
  const blocks: DocumentBlock[] = [];
  let currentBlockOrder = 0;

  for (const page of rawPages) {
    const pageNum = page.pageNumber;
    const text = page.text || '';
    pages.push({ pageNumber: pageNum, text });

    const sections = text
      .split(/\n\s*\n/)
      .map((s) => s.trim())
      .filter((s) => s.length > 0);

    for (const section of sections) {
      const lines = section.split('\n').map((l) => l.trim()).filter((l) => l.length > 0);
      let pendingTableLines: string[] = [];

      const flushTableBlock = () => {
        if (pendingTableLines.length > 0) {
          blocks.push({
            id: `pdf-block-${currentBlockOrder}`,
            type: BlockType.TABLE,
            content: pendingTableLines.join('\n'),
            order: currentBlockOrder,
            page: pageNum,
          });
          currentBlockOrder++;
          pendingTableLines = [];
        }
      };

      for (const line of lines) {
        const isTable = isTableLine(line);

        if (isTable) {
          pendingTableLines.push(line);
          continue;
        }

        flushTableBlock();

        const isHeading = isHeadingLine(line);
        const isBullet = /^[•\-\*\+]\s/.test(line) || /^\d+[\.\)]\s/.test(line);

        blocks.push({
          id: `pdf-block-${currentBlockOrder}`,
          type: isHeading
            ? BlockType.HEADING
            : isBullet
            ? BlockType.LIST_ITEM
            : BlockType.PARAGRAPH,
          content: line,
          order: currentBlockOrder,
          page: pageNum,
          headingLevel: isHeading ? 1 : undefined,
        });

        currentBlockOrder++;
      }

      flushTableBlock();
    }
  }

  return {
    pages,
    blocks,
    pageCount: pages.length,
  };
}

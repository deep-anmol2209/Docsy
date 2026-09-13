import { BlockType } from '../../common-types/enums';

export interface ExtractedArticleElement {
  readonly type: BlockType;
  readonly content: string;
  readonly headingLevel?: number;
}

export interface CleanedArticle {
  readonly title: string;
  readonly elements: readonly ExtractedArticleElement[];
}

export function cleanReadability(rawHtml: string): CleanedArticle {
  if (!rawHtml) {
    return { title: '', elements: [] };
  }

  const titleMatch = rawHtml.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  let title = titleMatch ? stripTags(titleMatch[1]).trim() : '';

  const cleaned = rawHtml
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<nav[\s\S]*?<\/nav>/gi, '')
    .replace(/<footer[\s\S]*?<\/footer>/gi, '')
    .replace(/<header[\s\S]*?<\/header>/gi, '')
    .replace(/<aside[\s\S]*?<\/aside>/gi, '')
    .replace(/<iframe[\s\S]*?<\/iframe>/gi, '')
    .replace(/<noscript[\s\S]*?<\/noscript>/gi, '')
    .replace(/<svg[\s\S]*?<\/svg>/gi, '')
    .replace(/<form[\s\S]*?<\/form>/gi, '');

  const elements: ExtractedArticleElement[] = [];
  const blockRegex = /<(h[1-6]|p|pre|ul|ol)[^>]*>([\s\S]*?)<\/>/gi;
  let match: RegExpExecArray | null;

  while ((match = blockRegex.exec(cleaned)) !== null) {
    const tag = match[1].toLowerCase();
    const innerHtml = match[2];

    if (tag.startsWith('h')) {
      const level = parseInt(tag.charAt(1), 10);
      const headingText = stripTags(innerHtml).trim();
      if (headingText) {
        if (!title && level === 1) {
          title = headingText;
        }
        elements.push({
          type: BlockType.HEADING,
          content: headingText,
          headingLevel: level,
        });
      }
    } else if (tag === 'p') {
      const pText = stripTags(innerHtml).trim();
      if (pText.length > 5) {
        elements.push({
          type: BlockType.PARAGRAPH,
          content: pText,
        });
      }
    } else if (tag === 'pre') {
      const codeText = stripTags(innerHtml).trim();
      if (codeText) {
        elements.push({
          type: BlockType.CODE_BLOCK,
          content: codeText,
        });
      }
    } else if (tag === 'ul' || tag === 'ol') {
      const itemMatches = innerHtml.match(/<li[^>]*>([\s\S]*?)<\/li>/gi);
      if (itemMatches) {
        for (const itemHtml of itemMatches) {
          const itemText = stripTags(itemHtml).trim();
          if (itemText) {
            elements.push({
              type: BlockType.LIST_ITEM,
              content: itemText,
            });
          }
        }
      }
    }
  }

  return { title, elements };
}

function stripTags(htmlStr: string): string {
  return htmlStr
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, ' ');
}

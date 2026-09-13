/**
 * Webpage Parser
 *
 * Responsibility:
 * ----------------
 * Convert a webpage URL into CommonDocument using Tavily Extract API,
 * with fallback to Readability HTML cleaner.
 */

import { BlockType, KNOWN_SOURCE_TYPES } from '../../common-types/enums';
import type { CommonDocument, DocumentBlock } from '../../common-types/document-model';
import type { Parser, ParseRequest } from '../parser-interface';
import { extractHtml } from './html-extractor';
import { cleanReadability } from './readability-cleaner';
import { extractWithTavily, isTavilyConfigured } from './tavily-client';

export const WebpageParser: Parser = {
  async parse(request: ParseRequest): Promise<CommonDocument> {
    const { sourceId, url, language, title: requestTitle } = request;

    if (!sourceId) {
      throw new Error('WebpageParser requires a valid sourceId');
    }
    if (!url) {
      throw new Error('WebpageParser requires a valid webpage URL');
    }

    let pageTitle = requestTitle || '';
    let extractedContent = '';
    let extractedBy = 'tavily';
    let images: string[] = [];

    if (isTavilyConfigured()) {
      try {
        console.log(`[WEBPAGE PARSER] 🌐 Extracting webpage content using Tavily API for URL: '${url}'`);
        const tavilyRes = await extractWithTavily(url);
        console.log("tavily: ", tavilyRes);
        
        if (!tavilyRes.content || tavilyRes.content.trim().length < 100) {
          console.log(`[WEBPAGE PARSER] ⚠️ Tavily extraction failed for '${url}'`);
          extractedContent = '';
        }
        extractedContent = tavilyRes.content;
        if (tavilyRes.title) {
          pageTitle = tavilyRes.title;
        }
        if (tavilyRes.images) {
          images = [...tavilyRes.images];
        }
      } catch (err: unknown) {
        console.warn(
          `[WEBPAGE PARSER] ⚠️ Tavily extraction failed for '${url}':`,
          err instanceof Error ? err.message : err
        );
        extractedContent = '';
      }
    }

    let blocks: DocumentBlock[] = [];

    if (!extractedContent.trim()) {
      extractedBy = 'readability';
      console.log(`[WEBPAGE PARSER] 🧹 Falling back to Readability HTML cleaner for URL: '${url}'`);
      let html = '';
      try {
        html = await extractHtml(url);
      } catch (err) {
        console.error(`[WEBPAGE PARSER] ❌ HTML fetch failed for '${url}':`, err);
      }

      if (html) {
        const cleaned = cleanReadability(html);
        if (!pageTitle && cleaned.title) {
          pageTitle = cleaned.title;
        }

        blocks = cleaned.elements.map((elem, idx) => ({
          id: `webpage-block-${idx}`,
          type: elem.type,
          content: elem.content,
          order: idx,
          headingLevel: elem.headingLevel,
        }));
      }
    } else {
      blocks = parseTextToBlocks(extractedContent);
    }

    if (blocks.length === 0) {
     throw new Error(`[WEBPAGEPARSER] unable to extract any content from utl: ${url}`);
    }

    const documentId = request.documentId ?? `doc-webpage-${sourceId}`;
    if (!pageTitle) {
      pageTitle = `Webpage: ${url}`;
    }

    return {
      documentId,
      sourceId,
      sourceType: KNOWN_SOURCE_TYPES.WEBPAGE,
      blocks,
      language: language ?? 'en',
      nativeMetadata: {
        title: pageTitle,
        url,
        extractedBy,
        blockCount: blocks.length,
        imageCount: images.length,
      },
      provenance: {
        parserName: 'WebpageParser',
        parserVersion: '1.0.0',
        parsedAt: new Date().toISOString(),
      },
    };
  },
};

function parseTextToBlocks(rawText: string): DocumentBlock[] {
  const rawParagraphs = rawText
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter((p) => p.length > 0);

  return rawParagraphs.map((content, idx) => {
    let type = BlockType.PARAGRAPH;
    let headingLevel: number | undefined = undefined;
    let cleanContent = content;

    const headingMatch = content.match(/^(#{1,6})\s+(.*)$/);
    if (headingMatch) {
      type = BlockType.HEADING;
      headingLevel = headingMatch[1].length;
      cleanContent = headingMatch[2].trim();
    } else if (/^[•\-\*]\s/.test(content) || /^\d+\.\s/.test(content)) {
      type = BlockType.LIST_ITEM;
    } else if (content.startsWith('```')) {
      type = BlockType.CODE_BLOCK;
      cleanContent = content.replace(/^```[a-z]*\n?/i, '').replace(/\n?```$/, '').trim();
    }

    return {
      id: `webpage-block-${idx}`,
      type,
      content: cleanContent,
      order: idx,
      headingLevel,
    };
  });
}

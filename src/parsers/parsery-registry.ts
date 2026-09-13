import { KNOWN_SOURCE_TYPES, type SourceType } from '../common-types/enums';
import type { Parser } from './parser-interface';
import { PdfParser } from './pdf/pdf-parser';
import { TextParser } from './text/text-parser';
import { MarkdownParser } from './markdown/markdown.parser';
import { YoutubeParser } from './youtube/youtube-parser';
import { WebpageParser } from './webpage/webpage.parser';

/**
 * Parser Registry
 *
 * Responsibility:
 * ----------------
 * Maintain the mapping between SourceType and Parser instance.
 *
 * Every registered parser MUST implement the unified `Parser` interface
 * (`parse(request: ParseRequest): Promise<CommonDocument>`). `ParsingStage`
 * builds exactly one `ParseRequest` per source and hands it to whichever
 * `Parser` this registry resolves — it never branches on source type.
 *
 * Registered parsers:
 *   pdf      → PdfParser      (downloads bytes from storageLocation, runs Unstructured/pdf2json)
 *   youtube  → YoutubeParser  (fetches transcript from url)
 *   text     → TextParser     (reads inlineText or downloads plain-text from storageLocation)
 *   markdown → MarkdownParser (reads inlineText or downloads .md from storageLocation)
 *   webpage  → WebpageParser  (fetches & parses HTML from url)
 */
export class ParserRegistry {
  private static readonly parsers: Map<string, Parser> = new Map();

  static {
    ParserRegistry.register(KNOWN_SOURCE_TYPES.PDF, PdfParser);
    ParserRegistry.register(KNOWN_SOURCE_TYPES.TEXT, new TextParser());
    ParserRegistry.register(KNOWN_SOURCE_TYPES.MARKDOWN, new MarkdownParser());
    ParserRegistry.register(KNOWN_SOURCE_TYPES.YOUTUBE, YoutubeParser);
    ParserRegistry.register(KNOWN_SOURCE_TYPES.WEBPAGE, WebpageParser);
  }

  public static register(sourceType: SourceType, parser: Parser): void {
    ParserRegistry.parsers.set(String(sourceType).toLowerCase(), parser);
  }

  public static get(sourceType: SourceType): Parser {
    const key = String(sourceType || '').toLowerCase();
    const parser = ParserRegistry.parsers.get(key);
    if (!parser) {
      console.warn(
        `[ParserRegistry] No parser registered for sourceType "${sourceType}". ` +
          'Falling back to TextParser.'
      );
      const fallback = ParserRegistry.parsers.get(KNOWN_SOURCE_TYPES.TEXT);
      if (!fallback) {
        throw new Error(
          `[ParserRegistry] No parser registered for sourceType "${sourceType}" and TextParser fallback is also missing.`
        );
      }
      return fallback;
    }
    return parser;
  }

  public static has(sourceType: SourceType): boolean {
    return ParserRegistry.parsers.has(String(sourceType || '').toLowerCase());
  }
}

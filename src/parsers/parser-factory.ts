import type { SourceType } from '../common-types/enums';
import type { Parser } from './parser-interface';
import { ParserRegistry } from './parsery-registry';

/**
 * Parser Factory
 *
 * Responsibility:
 * ----------------
 * Resolve Parser instances dynamically by SourceType via the ParserRegistry.
 *
 * Returns the unified `Parser` interface — every parser (`PdfParser`,
 * `YoutubeParser`, `TextParser`, `MarkdownParser`, `WebpageParser`) implements
 * `parse(request: ParseRequest): Promise<CommonDocument>`. `ParsingStage` calls
 * this and then invokes `parser.parse(request)` without any source-type branching.
 */
export class ParserFactory {
  /**
   * Resolves the appropriate Parser for the given sourceType.
   */
  public getParser(sourceType: SourceType): Parser {
    return ParserRegistry.get(sourceType);
  }
}
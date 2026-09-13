import { KNOWN_SOURCE_TYPES } from '../../common-types/enums';
import type { CommonDocument } from '../../common-types/document-model';
import type { Parser, ParseRequest } from '../parser-interface';
import { fetchYoutubeTranscript } from './transcript-fetcher';
import { mapTranscriptEvents } from './timestamp-mapper';

export const YoutubeParser: Parser = {
  async parse(request: ParseRequest): Promise<CommonDocument> {
    const { sourceId, url, language, documentId } = request;

    if (!url) {
      throw new Error(
        `[YoutubeParser] Cannot parse source "${sourceId}": no URL provided in ParseRequest. ` +
          'Ensure "originalReference" or "sourceInput.url" is set for YouTube sources.'
      );
    }

    console.log(`[YOUTUBE PARSER] 🎬 Fetching transcript for URL: "${url}"`);

    const result = await fetchYoutubeTranscript(url, {
      preferredLanguage: language,
    });

    const blocks = mapTranscriptEvents(result.events);

    let durationSeconds: number | undefined;
    if (blocks.length > 0) {
      const lastBlock = blocks[blocks.length - 1];
      durationSeconds = lastBlock.endTimeSeconds ?? lastBlock.startTimeSeconds;
    }

    const resolvedDocumentId = documentId ?? `doc-yt-${result.videoId}`;

    console.log(
      `[YOUTUBE PARSER] ✅ Fetched ${blocks.length} transcript blocks for video "${result.videoId}" ("${result.title ?? 'unknown title'}")`
    );

    return {
      documentId: resolvedDocumentId,
      sourceId,
      sourceType: KNOWN_SOURCE_TYPES.YOUTUBE,
      blocks,
      language: result.language ?? language ?? 'en',
      nativeMetadata: {
        videoId: result.videoId,
        title: result.title,
        durationSeconds,
        transcriptEventCount: result.events.length,
        blockCount: blocks.length,
      },
      provenance: {
        parserName: 'YoutubeParser',
        parserVersion: '2.0.0',
        parsedAt: new Date().toISOString(),
      },
    };
  },
};

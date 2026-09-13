import { YoutubeTranscript } from "youtube-transcript";
import { ValidationError } from "../../errors/app-error";
import type { RawTranscriptEvent } from "./timestamp-mapper";

export interface YoutubeTranscriptFetchResult {
  readonly videoId: string;
  readonly title?: string;
  readonly language?: string;
  readonly events: readonly RawTranscriptEvent[];
}

export interface YoutubeTranscriptFetcherOptions {
  readonly preferredLanguage?: string;
}

const YOUTUBE_URL_REGEX = /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([\w-]{11})/;
const YOUTUBE_SHORTS_REGEX = /youtube\.com\/shorts\/([\w-]{11})/;

export async function fetchYoutubeTranscript(
  url: string,
  options?: YoutubeTranscriptFetcherOptions
): Promise<YoutubeTranscriptFetchResult> {
  const videoId =
    url.match(YOUTUBE_URL_REGEX)?.[1] ??
    url.match(YOUTUBE_SHORTS_REGEX)?.[1];

  if (!videoId) {
    throw new ValidationError("Enter a valid YouTube URL");
  }

  try {
    type YoutubeTranscriptSegment = {
      text?: unknown;
      offset?: unknown;
      duration?: unknown;
    };

    const segments = (await YoutubeTranscript.fetchTranscript(videoId, {
      lang: options?.preferredLanguage,
    })) as YoutubeTranscriptSegment[];

    const events: RawTranscriptEvent[] = segments.map((segment) => ({
      text: String(segment.text ?? "").trim(),
      start:
        typeof segment.offset === "number"
          ? segment.offset / 1000
          : undefined,
      duration:
        typeof segment.duration === "number"
          ? segment.duration / 1000
          : undefined,
    }));

    const content = events.map((segment) => segment.text).join(" ").trim();
    if (!content) {
      throw new ValidationError("No transcript found for this video");
    }

    return {
      videoId,
      title: undefined,
      language: options?.preferredLanguage,
      events,
    };
  } catch {
    throw new ValidationError(
      "Could not fetch transcript. The video may not have captions."
    );
  }
}

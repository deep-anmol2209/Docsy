declare module "youtube-transcript" {
  export interface YoutubeTranscriptSegment {
    text?: string;
    offset?: number;
    duration?: number;
  }

  export const YoutubeTranscript: {
    fetchTranscript(
      videoId: string,
      options?: { lang?: string }
    ): Promise<YoutubeTranscriptSegment[]>;
  };
}

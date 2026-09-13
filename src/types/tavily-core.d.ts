declare module '@tavily/core' {
  export type TavilyClient = {
    extract(urls: string[], options: { extractDepth: string; format: string }): Promise<{
      results?: Array<Record<string, unknown>>;
      failedResults?: Array<{ error?: string }>;
    }>;
  };

  export function tavily(options: { apiKey: string }): TavilyClient;
}

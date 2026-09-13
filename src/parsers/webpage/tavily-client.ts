import { tavily, type TavilyClient } from '@tavily/core';

export interface TavilyExtractionResult {
  readonly title: string;
  readonly content: string;
  readonly images?: string[];
}

let tavilyClient: TavilyClient | null = null;

export function isTavilyConfigured(): boolean {
  return Boolean(process.env.TAVILY_API_KEY);
}

function getTavilyClient(): TavilyClient {
  const apiKey = process.env.TAVILY_API_KEY;
  if (!apiKey) {
    throw new Error('TAVILY_API_KEY environment variable is missing.');
  }

  if (!tavilyClient) {
    tavilyClient = tavily({ apiKey });
  }

  return tavilyClient;
}

export async function extractWithTavily(
  url: string,
): Promise<TavilyExtractionResult> {
  const client = getTavilyClient();

  const response = await client.extract([url], {
    extractDepth: "advanced",
    format: "markdown",
  });

  console.log("[TAVILY] Response:", response);

  if (!response.results?.length) {
    const failedResults = response.failedResults ?? [];

    throw new Error(
      `Tavily could not extract URL '${url}'. ` +
      `Failed results: ${JSON.stringify(failedResults)}`
    );
  }

  const result = response.results[0] as any;

  const content =
    result.rawContent ||
    result.raw_content ||
    result.content ||
    "";

  if (!content.trim()) {
    throw new Error(`Tavily returned an empty document for URL '${url}'.`);
  }

  return {
    title: result.title || "",
    content,
    images: result.images || [],
  };
}

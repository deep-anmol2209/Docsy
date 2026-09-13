/**
 * HTML Extractor
 *
 * Responsibility:
 * ----------------
 * Fetch and extract raw HTML from a webpage URL.
 */
export interface HtmlExtractionOptions {
  readonly timeoutMs?: number;
  readonly headers?: Record<string, string>;
  readonly maxRedirects?: number;
}

export async function extractHtml(
  url: string,
  options?: HtmlExtractionOptions
): Promise<string> {
  validateUrl(url);

  const timeoutMs = options?.timeoutMs ?? 10000;
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'User-Agent':
          'Mozilla/5.0 (compatible; ChaiLLM/1.0; +https://github.com/chai-llm)',
        Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        ...(options?.headers ?? {}),
      },
      signal: controller.signal,
      redirect: 'follow',
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch webpage ${url}: HTTP status ${response.status} ${response.statusText}`);
    }

    const contentType = response.headers.get('content-type') ?? '';
    if (!contentType.includes('text/html') && !contentType.includes('application/xhtml+xml')) {
      throw new Error(`Invalid content-type at ${url}: expected HTML but got '${contentType}'`);
    }

    return await response.text();
  } catch (error: unknown) {
    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error(`Request to ${url} timed out after ${timeoutMs}ms`);
    }
    throw error;
  } finally {
    clearTimeout(timeoutId);
  }
}

function validateUrl(url: string): void {
  if (!url || typeof url !== 'string') {
    throw new Error('URL must be a non-empty string');
  }

  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    throw new Error(`Invalid URL provided: '${url}'`);
  }

  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    throw new Error(`Unsupported protocol '${parsed.protocol}'. Only http and https URLs are supported.`);
  }
}

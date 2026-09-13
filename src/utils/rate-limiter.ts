/**
 * Fixed-window rate limiter for cost-sensitive endpoints (chat, artifact
 * generation — anything that triggers paid LLM calls).
 *
 * NOTE: in-memory and process-local. Resets on redeploy/restart and is
 * NOT shared across multiple serverless instances/regions — fine for a
 * single Node server or low/moderate traffic, but a multi-instance
 * production deployment should swap the `buckets` Map here for a shared
 * store (e.g. Upstash Redis) behind the same `checkRateLimit` signature;
 * nothing above this layer needs to change.
 */

import { TooManyRequestsError } from "@/src/errors/app-error";

type Bucket = { count: number; windowStart: number };

const buckets = new Map<string, Bucket>();

export function checkRateLimit(
  key: string,
  options: { limit: number; windowMs: number },
): void {
  const now = Date.now();
  const bucket = buckets.get(key);

  if (!bucket || now - bucket.windowStart >= options.windowMs) {
    buckets.set(key, { count: 1, windowStart: now });
    return;
  }

  bucket.count += 1;

  if (bucket.count > options.limit) {
    const retryAfterSeconds = Math.ceil(
      (options.windowMs - (now - bucket.windowStart)) / 1000,
    );
    throw new TooManyRequestsError(
      `Rate limit exceeded. Try again in ${retryAfterSeconds}s.`,
      { retryAfterSeconds },
    );
  }
}

/**
 * Retry Policy helpers
 *
 * Responsibility:
 * ----------------
 * Decide when and how failed stages should retry.
 */

export interface RetryPolicyConfig {
  readonly maxRetries: number;
  readonly baseDelayMs: number;
  readonly maxDelayMs: number;
  readonly backoffFactor: number;
}

export const DEFAULT_RETRY_POLICY_CONFIG: RetryPolicyConfig = {
  maxRetries: 3,
  baseDelayMs: 1000,
  maxDelayMs: 30000,
  backoffFactor: 2,
};

export function shouldRetry(
  currentAttempt: number,
  error: unknown,
  config: RetryPolicyConfig = DEFAULT_RETRY_POLICY_CONFIG,
): boolean {
  if (currentAttempt >= config.maxRetries) {
    return false;
  }
  return isRetryableError(error);
}

export function getBackoffDelayMs(
  attempt: number,
  config: RetryPolicyConfig = DEFAULT_RETRY_POLICY_CONFIG,
): number {
  const delay = config.baseDelayMs * Math.pow(config.backoffFactor, attempt);
  return Math.min(delay, config.maxDelayMs);
}

export function isRetryableError(error?: unknown): boolean {
  if (!error) return true;
  if (error instanceof Error) {
    const message = error.message.toLowerCase();
    if (
      message.includes('validation failed') ||
      message.includes('unsupported source') ||
      message.includes('invalid credentials') ||
      message.includes('not found')
    ) {
      return false;
    }
  }
  return true;
}
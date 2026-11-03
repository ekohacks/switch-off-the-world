// The answer key for exercise 6. `npm run solve` copies it over ../retry.skeleton.ts.
import type { Clock } from '../../src/clock.ts';
import type { HttpClient, HttpResult } from '../httpClient.skeleton.ts';

export interface RetryPolicy {
  backoffMs: readonly number[];
}

export type AttemptedResult = HttpResult & { attempts: number };

export function isRetryable(result: HttpResult): boolean {
  return result.status === 'timeout' || result.status >= 500;
}

export async function getWithRetry(
  client: HttpClient,
  clock: Clock,
  url: string,
  policy: RetryPolicy,
): Promise<AttemptedResult> {
  for (let attempt = 0; ; attempt++) {
    const result = await client.get(url);
    const backoff = policy.backoffMs[attempt];
    if (!isRetryable(result) || backoff === undefined) {
      return { ...result, attempts: attempt + 1 };
    }
    await clock.waitAsync(backoff);
  }
}

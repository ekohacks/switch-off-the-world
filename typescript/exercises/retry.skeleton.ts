// Exercise 6: climb one level. A retry policy on top of the client, waiting through the
// Clock, so the test advances time instead of sleeping. In the observatory, production's
// getWithRetry() in its Bank of Greece client is this same loop; solutions/retry.ts is
// the answer key.
import type { Clock } from '../src/clock.ts';
import type { HttpClient, HttpResult } from './httpClient.skeleton.ts';

export interface RetryPolicy {
  // How long to wait before each retry; the length is the number of retries.
  backoffMs: readonly number[];
}

export type AttemptedResult = HttpResult & { attempts: number };

// A 5xx or a timeout is worth another try; a 404 is not, since the dated URL will
// not come back, and a 200 is the answer.
export function isRetryable(result: HttpResult): boolean {
  return result.status === 'timeout' || result.status >= 500;
}

// TODO exercise 6: get the URL; while the result is retryable and a backoff remains,
// wait that long on the clock and try again; answer the last result with the number
// of attempts made.
export function getWithRetry(
  client: HttpClient,
  clock: Clock,
  url: string,
  policy: RetryPolicy,
): Promise<AttemptedResult> {
  void client;
  void clock;
  void url;
  void policy;
  return Promise.reject(
    new Error('TODO exercise 6: getWithRetry() waits through the clock'),
  );
}

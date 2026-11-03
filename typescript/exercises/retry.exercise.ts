// Exercise 6: a retry policy on the client, tested without sleeping. The nulled clock
// stands still until the test advances it; every wait that comes due fires in order.
import { describe, expect, it } from 'vitest';
import { Clock } from '../src/clock.ts';
import { HttpClient } from './httpClient.skeleton.ts';
import { getWithRetry } from './retry.skeleton.ts';

const URL = 'https://null.bankofgreece.invalid/prices.xls';
const OK = { status: 200, body: Uint8Array.from([1]) };
const DOWN = { status: 503, body: new Uint8Array() };
const POLICY = { backoffMs: [1000, 2000] };

describe('Exercise 6: climb one level, a retry through the clock', () => {
  it('answers a 200 at once with one attempt', async () => {
    const client = HttpClient.createNull({ [URL]: OK });

    const result = await getWithRetry(client, Clock.createNull(), URL, POLICY);

    expect(result).toEqual({ ...OK, attempts: 1 });
  });

  it('retries a 503 after one second, then two, and answers the 200 with three attempts', async () => {
    const client = HttpClient.createNull({ [URL]: [DOWN, DOWN, OK] });
    const clock = Clock.createNull();
    const requests = client.trackRequests();

    const pending = getWithRetry(client, clock, URL, POLICY);
    await clock.advanceNulledClockAsync(1000);
    expect(requests.data).toHaveLength(2);
    await clock.advanceNulledClockAsync(2000);

    expect(await pending).toEqual({ ...OK, attempts: 3 });
    expect(requests.data).toHaveLength(3);
  });

  it('gives up after the last backoff and answers what it got', async () => {
    const client = HttpClient.createNull({ [URL]: DOWN });
    const clock = Clock.createNull();

    const pending = getWithRetry(client, clock, URL, POLICY);
    await clock.advanceNulledClockAsync(3000);

    expect(await pending).toEqual({ ...DOWN, attempts: 3 });
  });

  it('does not retry a 404: the dated URL will not come back', async () => {
    const client = HttpClient.createNull({
      [URL]: { status: 404, body: new Uint8Array() },
    });
    const requests = client.trackRequests();

    const result = await getWithRetry(client, Clock.createNull(), URL, POLICY);

    expect(result.attempts).toBe(1);
    expect(requests.data).toHaveLength(1);
  });

  it('retries a timeout, which is a result like any other', async () => {
    const client = HttpClient.createNull({ [URL]: ['timeout', OK] });
    const clock = Clock.createNull();

    const pending = getWithRetry(client, clock, URL, POLICY);
    await clock.advanceNulledClockAsync(1000);

    expect(await pending).toEqual({ ...OK, attempts: 2 });
  });
});

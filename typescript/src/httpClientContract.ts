import { expect, it } from 'vitest';
import type { HttpRequest, HttpResponse, HttpResult } from './httpClient.ts';
import type { OutputTracker } from './outputTracker.ts';

// The behaviour every HttpClient must honour, real or null: rule three of the EkoHacks
// gate contract, a null may not drift from the real.
// The unit file runs this list on createNull() with the routes as configured
// responses; the narrow file runs it on create() against a real node:http server
// that serves the same routes. A route answers once for ever (one response), in
// order (an array), or never ('timeout'). If the two sides disagree, one of these
// fails.
export type ContractAnswer = HttpResponse | 'timeout';
export type ContractRoutes = Record<string, ContractAnswer | ContractAnswer[]>;

// The contract names behaviour, not a class: anything with get() and
// trackRequests() can be held to it, production's HttpClient or the workshop's.
export interface HttpClientLike {
  get(url: string): Promise<HttpResult>;
  trackRequests(): OutputTracker<HttpRequest>;
}

export interface HttpClientFixture {
  client: HttpClientLike;
  url: (path: string) => string;
  close: () => Promise<void>;
}

export type MakeHttpClient = (
  routes: ContractRoutes,
  options: { timeoutMs: number },
) => Promise<HttpClientFixture>;

// The OLE2 magic number, the first bytes of a real Bank of Greece .xls. Not valid
// UTF-8: a wrapper that round trips a body through a string replaces these bytes
// with U+FFFD and fails the equality below. 'hello' would let it pass.
export const XLS_MAGIC = Uint8Array.from([
  0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1,
]);

const TIMEOUT_MS = 50;

export function httpClientContract(make: MakeHttpClient): void {
  const using = async (
    routes: ContractRoutes,
    work: (fixture: HttpClientFixture) => Promise<void>,
  ): Promise<void> => {
    const fixture = await make(routes, { timeoutMs: TIMEOUT_MS });
    try {
      await work(fixture);
    } finally {
      await fixture.close();
    }
  };

  it('downloads a binary body as bytes, untouched', async () => {
    await using(
      { '/statistics/prices.xls': { status: 200, body: XLS_MAGIC } },
      async ({ client, url }) => {
        const response = await client.get(url('/statistics/prices.xls'));

        expect(response).toEqual({ status: 200, body: XLS_MAGIC });
      },
    );
  });

  it('reports a status other than 200 as a value, never a throw', async () => {
    // Bank of Greece distribution URLs are dated and go stale; callers decide what a 404
    // means, so the wrapper surfaces the status instead of exploding.
    await using(
      { '/statistics/moved.xls': { status: 404, body: new Uint8Array() } },
      async ({ client, url }) => {
        const response = await client.get(url('/statistics/moved.xls'));

        expect(response.status).toBe(404);
      },
    );
  });

  it('reports a request that never answers as a timeout result after timeoutMs', async () => {
    await using(
      { '/statistics/slow.xls': 'timeout' },
      async ({ client, url }) => {
        const result = await client.get(url('/statistics/slow.xls'));

        expect(result).toEqual({ status: 'timeout', timeoutMs: TIMEOUT_MS });
      },
    );
  });

  it('answers a sequence in order, so "503 then 200" is one route', async () => {
    await using(
      {
        '/statistics/flaky.xls': [
          { status: 503, body: new Uint8Array() },
          { status: 200, body: Uint8Array.from([1]) },
        ],
      },
      async ({ client, url }) => {
        const first = await client.get(url('/statistics/flaky.xls'));
        const second = await client.get(url('/statistics/flaky.xls'));

        expect(first.status).toBe(503);
        expect(second).toEqual({ status: 200, body: Uint8Array.from([1]) });
      },
    );
  });

  it('tracks every request as method and url, in order, the one that timed out included', async () => {
    await using(
      {
        '/catalog.xml': { status: 200, body: new Uint8Array() },
        '/slow.xls': 'timeout',
      },
      async ({ client, url }) => {
        const requests = client.trackRequests();

        await client.get(url('/catalog.xml'));
        await client.get(url('/slow.xls'));

        expect(requests.data).toEqual([
          { method: 'GET', url: url('/catalog.xml') },
          { method: 'GET', url: url('/slow.xls') },
        ]);
      },
    );
  });
}

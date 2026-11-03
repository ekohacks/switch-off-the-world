// Exercises 2 to 5 against the skeleton. Run one exercise at a time:
//   npx vitest run -t "Exercise 2"
// Everything is red until its exercise is done; the message names the exercise.
import { createServer, type Server } from 'node:http';
import { afterEach, describe, expect, it } from 'vitest';
import { HttpClient, type HttpResponse } from './httpClient.skeleton.ts';

// The first eight bytes of a real .xls, not valid UTF-8: a client that round trips a
// body through a string turns them into U+FFFD and fails the equality below.
export const XLS_MAGIC = Uint8Array.from([
  0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1,
]);

const servers: Server[] = [];
afterEach(async () => {
  for (const server of servers.splice(0)) {
    await new Promise<void>((resolve) => server.close(() => resolve()));
  }
});

// The one place in this folder that opens a socket: a real node:http server on a free
// port, answering the two routes exercise 2 needs and never answering a third.
async function realServer(): Promise<(path: string) => string> {
  const server = createServer((request, response) => {
    if (request.url === '/prices.xls') {
      response.writeHead(200, { 'Content-Type': 'application/vnd.ms-excel' });
      response.end(XLS_MAGIC);
    } else if (request.url === '/slow.xls') {
      // never answered: the client's timeout must fire
    } else {
      response.writeHead(404);
      response.end();
    }
  });
  servers.push(server);
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  const address = server.address();
  const port =
    typeof address === 'object' && address !== null ? address.port : 0;
  return (path) => `http://127.0.0.1:${String(port)}${path}`;
}

const NULL_URL = 'https://null.bankofgreece.invalid/prices.xls';
const bytes = (status: number, ...body: number[]): HttpResponse => ({
  status,
  body: Uint8Array.from(body),
});

describe('Exercise 2: the narrow integration test, the only one allowed a socket', () => {
  it('downloads a binary body as bytes, untouched', async () => {
    const url = await realServer();
    const client = HttpClient.create();

    const result = await client.get(url('/prices.xls'));

    expect(result).toEqual({ status: 200, body: XLS_MAGIC });
  });

  it('reports a 404 as a value, never a throw', async () => {
    const url = await realServer();
    const client = HttpClient.create();

    const result = await client.get(url('/moved.xls'));

    expect(result.status).toBe(404);
  });

  it('reports a request that never answers as a timeout result', async () => {
    const url = await realServer();
    const client = HttpClient.create({ timeoutMs: 50 });

    const result = await client.get(url('/slow.xls'));

    expect(result).toEqual({ status: 'timeout', timeoutMs: 50 });
  });
});

describe('Exercise 3: the off switch', () => {
  it('needs no parameters and no network: a .invalid host answers an empty 200', async () => {
    const client = HttpClient.createNull();

    const result = await client.get(NULL_URL);

    expect(result).toEqual({ status: 200, body: new Uint8Array() });
  });

  it('runs the same get() as the real client: a configured 404 is still a value', async () => {
    const client = HttpClient.createNull({ [NULL_URL]: bytes(404) });

    expect((await client.get(NULL_URL)).status).toBe(404);
  });
});

describe('Exercise 4: configurable responses', () => {
  it('answers one configured response for ever', async () => {
    const client = HttpClient.createNull({ [NULL_URL]: bytes(200, 1, 2) });

    expect(await client.get(NULL_URL)).toEqual(bytes(200, 1, 2));
    expect(await client.get(NULL_URL)).toEqual(bytes(200, 1, 2));
  });

  it('answers an array in order: "503 then 200" is one route', async () => {
    const client = HttpClient.createNull({
      [NULL_URL]: [bytes(503), bytes(200, 7)],
    });

    expect((await client.get(NULL_URL)).status).toBe(503);
    expect(await client.get(NULL_URL)).toEqual(bytes(200, 7));
  });

  it('runs dry loudly, naming the URL, so a third request cannot pass in silence', async () => {
    const client = HttpClient.createNull({ [NULL_URL]: [bytes(200)] });
    await client.get(NULL_URL);

    await expect(client.get(NULL_URL)).rejects.toThrow(NULL_URL);
  });

  it('answers the word timeout as a timeout result carrying the configured timeout', async () => {
    const client = HttpClient.createNull(
      { [NULL_URL]: 'timeout' },
      { timeoutMs: 50 },
    );

    expect(await client.get(NULL_URL)).toEqual({
      status: 'timeout',
      timeoutMs: 50,
    });
  });
});

describe('Exercise 5: output tracking', () => {
  it('records each request as behaviour, method and url, in order', async () => {
    const client = HttpClient.createNull();
    const requests = client.trackRequests();

    await client.get('https://null.invalid/catalog.xml');
    await client.get('https://null.invalid/prices.xls');

    expect(requests.data).toEqual([
      { method: 'GET', url: 'https://null.invalid/catalog.xml' },
      { method: 'GET', url: 'https://null.invalid/prices.xls' },
    ]);
  });

  it('records a request that timed out, since it went out', async () => {
    const client = HttpClient.createNull({ [NULL_URL]: 'timeout' });
    const requests = client.trackRequests();

    await client.get(NULL_URL);

    expect(requests.data).toEqual([{ method: 'GET', url: NULL_URL }]);
  });

  it('sees only what happened after it was created, and clear() starts it over', async () => {
    const client = HttpClient.createNull();
    await client.get('https://null.invalid/before');
    const requests = client.trackRequests();

    await client.get('https://null.invalid/after');
    const first = requests.clear();
    await client.get('https://null.invalid/later');

    expect(first).toEqual([
      { method: 'GET', url: 'https://null.invalid/after' },
    ]);
    expect(requests.data).toEqual([
      { method: 'GET', url: 'https://null.invalid/later' },
    ]);
  });
});

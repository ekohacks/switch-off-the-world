// Exercise 1: the two lies of a mock, run before anything is built. Read, run, predict.
// sizeOf() asks the client for a file and answers its size. Version 1 asks once;
// version 2 retries once on a 503, which is a better program and the same behaviour
// for every caller. A test loyal to the call turns red on the better program; a test
// loyal to the behaviour stays green, and goes red when the behaviour changes.
import { describe, expect, it, vi } from 'vitest';
import { HttpClient, type HttpResult } from '../src/httpClient.ts';

interface Downloads {
  get(url: string): Promise<HttpResult>;
}

export async function sizeOfV1(
  client: Downloads,
  url: string,
): Promise<number> {
  const result = await client.get(url);
  return result.status === 200 ? result.body.byteLength : 0;
}

export async function sizeOfV2(
  client: Downloads,
  url: string,
): Promise<number> {
  let result = await client.get(url);
  if (result.status === 503) {
    result = await client.get(url);
  }
  return result.status === 200 ? result.body.byteLength : 0;
}

const URL = 'https://null.bankofgreece.invalid/prices.xls';
const FIVE_BYTES = { status: 200, body: Uint8Array.from([1, 2, 3, 4, 5]) };

describe('Exercise 1: the two lies', () => {
  describe('a test loyal to the call', () => {
    it('is green on version 1', async () => {
      const get = vi.fn().mockResolvedValue(FIVE_BYTES);

      expect(await sizeOfV1({ get }, URL)).toBe(5);
      expect(get).toHaveBeenCalledTimes(1);
      expect(get).toHaveBeenCalledWith(URL);
    });

    it.fails(
      'is red on version 2, which behaves the same: the first lie',
      async () => {
        const get = vi
          .fn()
          .mockResolvedValueOnce({ status: 503, body: new Uint8Array() })
          .mockResolvedValue(FIVE_BYTES);

        expect(await sizeOfV2({ get }, URL)).toBe(5);
        expect(get).toHaveBeenCalledTimes(1);
      },
    );

    it('stays green while the function answers nonsense: the second lie', async () => {
      // A mock answers a shape the real client never produces: a body that is not bytes.
      // The call assertion is green; the size a user would see is not a number at all.
      const get = vi
        .fn()
        .mockResolvedValue({ status: 200, body: 'five bytes' });

      const size = await sizeOfV1({ get }, URL);

      expect(get).toHaveBeenCalledWith(URL);
      expect(size).toBeUndefined();
    });
  });

  describe('a test loyal to the behaviour, on the null', () => {
    it('is green on version 1 and version 2 alike', async () => {
      const client = HttpClient.createNull({
        [URL]: [{ status: 503, body: new Uint8Array() }, FIVE_BYTES],
      });

      expect(await sizeOfV2(client, URL)).toBe(5);
      expect(
        await sizeOfV1(HttpClient.createNull({ [URL]: FIVE_BYTES }), URL),
      ).toBe(5);
    });

    it('says what went out, as behaviour, not as calls', async () => {
      const client = HttpClient.createNull({ [URL]: FIVE_BYTES });
      const requests = client.trackRequests();

      await sizeOfV1(client, URL);

      expect(requests.data).toEqual([{ method: 'GET', url: URL }]);
    });
  });
});

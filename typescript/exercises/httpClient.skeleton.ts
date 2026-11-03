// The workshop skeleton: HttpClient with every body missing. Exercises 2 to 5 fill it
// in, one `describe` of httpClient.exercise.ts at a time. The shape is production's,
// ../src/httpClient.ts, which is also the answer key; solutions/httpClient.ts is the
// same file, and `npm run solve` copies it over this one for a pair that falls behind.
import { ConfigurableResponses } from '../src/configurableResponses.ts';
import { OutputListener, type OutputTracker } from '../src/outputTracker.ts';

export interface HttpResponse {
  status: number;
  body: Uint8Array<ArrayBuffer>;
}

export interface HttpTimeout {
  status: 'timeout';
  timeoutMs: number;
}

export type HttpResult = HttpResponse | HttpTimeout;

export interface HttpRequest {
  method: 'GET';
  url: string;
}

export type NullResponse = HttpResponse | 'timeout';
export type ConfiguredResponse = NullResponse | NullResponse[];

export interface HttpClientOptions {
  timeoutMs?: number;
}

const DEFAULT_TIMEOUT_MS = 10_000;

type FetchFunction = (url: string) => Promise<Response>;

const todo = (exercise: number, what: string): never => {
  throw new Error(`TODO exercise ${String(exercise)}: ${what}`);
};

export class HttpClient {
  // Exercise 2. Build the real client: hand the constructor a function that calls
  // globalThis.fetch with the URL and an AbortSignal.timeout(timeoutMs).
  static create({
    timeoutMs = DEFAULT_TIMEOUT_MS,
  }: HttpClientOptions = {}): HttpClient {
    void timeoutMs;
    return todo(2, 'create() hands the constructor a real fetch');
  }

  // Exercise 3, then 4. Build the null client: hand the constructor stubbedFetch()
  // instead of the real fetch. Nothing else changes; get() runs the same lines.
  static createNull(
    responses: Record<string, ConfiguredResponse> = {},
    { timeoutMs = DEFAULT_TIMEOUT_MS }: HttpClientOptions = {},
  ): HttpClient {
    void responses;
    void timeoutMs;
    return todo(3, 'createNull() hands the constructor the stubbed fetch');
  }

  // Exercise 5. The listener every request is emitted to.
  private readonly _requests = new OutputListener<HttpRequest>();

  private constructor(
    private readonly _fetch: FetchFunction,
    private readonly _timeoutMs: number,
  ) {
    void this._fetch;
    void this._timeoutMs;
    void this._requests;
  }

  // Exercise 5. A tracker over the listener: the caller reads what was requested.
  trackRequests(): OutputTracker<HttpRequest> {
    return todo(5, 'trackRequests() creates a tracker on the listener');
  }

  // Exercise 2: call this._fetch, answer { status, body: new Uint8Array(await
  // response.arrayBuffer()) }. A non-200 status is a value, never a throw.
  // Exercise 2, second half: catch a TimeoutError and answer { status: 'timeout',
  // timeoutMs }. Exercise 5: emit { method: 'GET', url } before fetching.
  get(url: string): Promise<HttpResult> {
    void url;
    return Promise.reject(
      new Error('TODO exercise 2: get() fetches and answers a result'),
    );
  }
}

// Exercise 2, second half: what fetch rejects with when AbortSignal.timeout() fires.
export function isTimeout(error: unknown): boolean {
  return error instanceof DOMException && error.name === 'TimeoutError';
}

export function timeoutError(): DOMException {
  return new DOMException(
    'The operation was aborted due to timeout',
    'TimeoutError',
  );
}

// Exercise 3: the Embedded Stub. A function with fetch's shape that never opens a
// socket: an unconfigured URL answers an empty 200. Exercise 4: each URL gets its own
// ConfigurableResponses (ConfigurableResponses.mapObject(responses, 'HttpClient')),
// so one answer repeats, an array is consumed in order and runs dry with an error
// that names the URL; the word 'timeout' rejects with timeoutError().
export function stubbedFetch(
  responses: Record<string, ConfiguredResponse>,
): FetchFunction {
  void responses;
  void ConfigurableResponses;
  return () =>
    Promise.reject(
      new Error('TODO exercise 3: stubbedFetch() answers without a socket'),
    );
}

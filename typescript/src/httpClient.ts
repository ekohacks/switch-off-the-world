// The observatory's src/infrastructure/httpClient.ts, the wrapper every Bank of
// Greece download goes through, as of 3 November 2026. The finished client that
// exercise 1 runs on; exercises 2 to 5 rebuild it in ../exercises/httpClient.skeleton.ts.
import { ConfigurableResponses } from './configurableResponses.ts';
import { OutputListener, type OutputTracker } from './outputTracker.ts';

export interface HttpResponse {
  status: number;
  // Uint8Array<ArrayBuffer> (not bare Uint8Array): TS 6 needs the backing
  // buffer type to accept the body as a fetch Response BodyInit.
  body: Uint8Array<ArrayBuffer>;
}

// A timeout is a result the caller can see, not an exception. The
// word sits where a status code would, so `status !== 200` is true for it
// like for a 503, and a caller that treats it specially narrows on the word.
export interface HttpTimeout {
  status: 'timeout';
  timeoutMs: number;
}

export type HttpResult = HttpResponse | HttpTimeout;

// What a request looks like from the outside, the behaviour callers care
// about. Deliberately not "fetch was called with…": swap fetch for undici
// tomorrow and trackRequests() output does not change.
export interface HttpRequest {
  method: 'GET';
  url: string;
}

// A nulled answer: a response, or the word 'timeout' to make the stubbed
// fetch fail the way the real one does when its timer fires.
export type NullResponse = HttpResponse | 'timeout';
export type ConfiguredResponse = NullResponse | NullResponse[];

export interface HttpClientOptions {
  timeoutMs?: number;
}

// A transport must never hang for ever. Callers with a slower counterpart
// pass their own.
const DEFAULT_TIMEOUT_MS = 10_000;

// Narrower than typeof fetch: we only ever call it with a string URL, and the
// real fetch is assignable to this shape.
type FetchFunction = (url: string) => Promise<Response>;

export class HttpClient {
  static create({
    timeoutMs = DEFAULT_TIMEOUT_MS,
  }: HttpClientOptions = {}): HttpClient {
    return new HttpClient(
      (url) =>
        globalThis.fetch(url, { signal: AbortSignal.timeout(timeoutMs) }),
      timeoutMs,
    );
  }

  // Configurable Responses, keyed by URL. A single response repeats for
  // ever; an array is consumed in order and throws when it runs dry, so a
  // test that says "503 then 200" cannot silently get a third answer. The
  // same options as create(), so a timeout result reports the timeout the
  // caller configured, real or null (the contract list checks it).
  static createNull(
    responses: Record<string, ConfiguredResponse> = {},
    { timeoutMs = DEFAULT_TIMEOUT_MS }: HttpClientOptions = {},
  ): HttpClient {
    return new HttpClient(stubbedFetch(responses), timeoutMs);
  }

  private readonly _requests = new OutputListener<HttpRequest>();

  private constructor(
    private readonly _fetch: FetchFunction,
    private readonly _timeoutMs: number,
  ) {}

  trackRequests(): OutputTracker<HttpRequest> {
    return this._requests.createTracker();
  }

  async get(url: string): Promise<HttpResult> {
    this._requests.emit({ method: 'GET', url });
    try {
      const response = await this._fetch(url);
      return {
        status: response.status,
        body: new Uint8Array(await response.arrayBuffer()),
      };
    } catch (error: unknown) {
      if (isTimeout(error)) {
        return { status: 'timeout', timeoutMs: this._timeoutMs };
      }
      throw error;
    }
  }
}

// What fetch rejects with when AbortSignal.timeout() fires, real or stubbed.
function isTimeout(error: unknown): boolean {
  return error instanceof DOMException && error.name === 'TimeoutError';
}

function timeoutError(): DOMException {
  return new DOMException(
    'The operation was aborted due to timeout',
    'TimeoutError',
  );
}

// Embedded stub: nulls the third party boundary (fetch), not our own code,
// so get() runs the same code path whether the client is real or nulled.
function stubbedFetch(
  responses: Record<string, ConfiguredResponse>,
): FetchFunction {
  // Each URL gets its own ConfigurableResponses: a single response repeats,
  // an array is consumed in order and runs dry loudly (Shore's helper).
  const configured = ConfigurableResponses.mapObject(responses, 'HttpClient');
  return (url) => {
    const forUrl = configured[url];
    if (forUrl === undefined) {
      return Promise.resolve(new Response());
    }
    try {
      const next = forUrl.next();
      if (next === 'timeout') {
        return Promise.reject(timeoutError());
      }
      return Promise.resolve(new Response(next.body, { status: next.status }));
    } catch (error: unknown) {
      return Promise.reject(
        error instanceof Error ? error : new Error(String(error)),
      );
    }
  };
}

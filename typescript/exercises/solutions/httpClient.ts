// The answer key for exercises 2 to 5: ../../src/httpClient.ts with the workshop's
// import paths. To check your work, `npm run solve` copies it over
// ../httpClient.skeleton.ts and `npm run exercise` shows every exercise green;
// `npm run reset` brings the blank skeleton back.
import { ConfigurableResponses } from '../../src/configurableResponses.ts';
import { OutputListener, type OutputTracker } from '../../src/outputTracker.ts';

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

export function isTimeout(error: unknown): boolean {
  return error instanceof DOMException && error.name === 'TimeoutError';
}

export function timeoutError(): DOMException {
  return new DOMException(
    'The operation was aborted due to timeout',
    'TimeoutError',
  );
}

export function stubbedFetch(
  responses: Record<string, ConfiguredResponse>,
): FetchFunction {
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

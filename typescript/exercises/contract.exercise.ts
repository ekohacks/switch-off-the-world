// The closing check: production's contract list, run on the skeleton's null and on
// its real client against a local server. If your null answers differently from your
// real client, one of these fails and names it. This is rule three of the EkoHacks gate
// contract, a null may not drift from the real, and the subject of the post "What a
// Null Cannot See".
import { createServer, type Server } from 'node:http';
import { describe } from 'vitest';
import {
  httpClientContract,
  type ContractAnswer,
  type ContractRoutes,
} from '../src/httpClientContract.ts';
import { HttpClient } from './httpClient.skeleton.ts';

describe('Closing: the contract, on the null', () => {
  httpClientContract((routes, options) => {
    const base = 'https://null.bankofgreece.invalid';
    const responses = Object.fromEntries(
      Object.entries(routes).map(([path, answer]) => [
        `${base}${path}`,
        answer,
      ]),
    );
    return Promise.resolve({
      client: HttpClient.createNull(responses, options),
      url: (path: string) => `${base}${path}`,
      close: () => Promise.resolve(),
    });
  });
});

describe('Closing: the contract, on the real client against a local server', () => {
  httpClientContract(async (routes: ContractRoutes, options) => {
    const queues = new Map<string, ContractAnswer[]>();
    const nextAnswer = (path: string): ContractAnswer | undefined => {
      const configured = routes[path];
      if (configured === undefined) {
        return undefined;
      }
      if (!Array.isArray(configured)) {
        return configured;
      }
      const queue = queues.get(path) ?? [...configured];
      queues.set(path, queue);
      return queue.shift();
    };
    const server: Server = createServer((request, response) => {
      const answer = nextAnswer(request.url ?? '');
      if (answer === undefined) {
        response.writeHead(404);
        response.end();
      } else if (answer === 'timeout') {
        // accepted, never answered
      } else {
        response.writeHead(answer.status);
        response.end(answer.body);
      }
    });
    await new Promise<void>((resolve) =>
      server.listen(0, '127.0.0.1', resolve),
    );
    const address = server.address();
    const port =
      typeof address === 'object' && address !== null ? address.port : 0;
    return {
      client: HttpClient.create(options),
      url: (path: string) => `http://127.0.0.1:${String(port)}${path}`,
      close: () =>
        new Promise<void>((resolve) => {
          server.closeAllConnections();
          server.close(() => resolve());
        }),
    };
  });
});

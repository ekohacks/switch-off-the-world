# Workshop: switch off the world, build a Nullable HTTP client, test first

Ninety minutes, in pairs, nobody codes alone. You leave with a wrapper you can reuse
for every external system you ever meet: an HTTP client that returns bytes, proven
once against a real local server, with an off switch, `createNull()`, that replaces
`fetch` and nothing else. No mocking library is installed. Each step is a red test the
room makes green.

The same six steps are the EkoHacks course's week 2 exercise, and the WeTest.Athens
90-minute session. The full-day version adds the closing block at the end.

## Before you start

- Node 24 and git. Clone this repository, then `cd typescript && npm ci`.
- Run the whole set once to see the starting state:

  ```sh
  npm run exercise
  ```

  Exercise 1 is green, the rest are red, and every red names its exercise:
  `TODO exercise 3: createNull() hands the constructor the stubbed fetch`.

- Run one exercise at a time while you work:

  ```sh
  npx vitest run -t "Exercise 2"
  ```

- Two files are yours to edit: `httpClient.skeleton.ts` (exercises 2 to 5) and
  `retry.skeleton.ts` (exercise 6). The tests in `*.exercise.ts` are the specification;
  do not edit them. The answer key is `solutions/`; see "If you fall behind".

## The rule of the day

Reads are configured, writes are witnessed. A wrapper that reads from the outside world
takes its answers as a parameter of `createNull()`; a wrapper that writes to the outside
world exposes a tracker that records the write as behaviour. `HttpClient` does both.

## The six exercises

### 1. The two lies (10 min, read and run)

`mock.exercise.ts`. Nothing to write. `sizeOfV1` asks the client once; `sizeOfV2`
retries once on a 503, a better program with the same behaviour. Run the file and read
the four verdicts: the test loyal to the call is green on version 1, red on version 2
(`it.fails` marks it), and stays green while the function answers nonsense. The test on
the null is green on both versions and says what went out as behaviour. Question for the
pair: which refactoring would break each test?

### 2. The narrow integration test (20 min)

`httpClient.exercise.ts`, "Exercise 2". The only test in this folder allowed to open a
socket: a real `node:http` server on a free port, serving the first eight bytes of a real
`.xls`. Make `create()` and `get()` work:

- `create()` hands the constructor a function that calls `globalThis.fetch(url, {
signal: AbortSignal.timeout(timeoutMs) })`.
- `get()` calls `this._fetch(url)` and answers `{ status, body }` with the body as
  `new Uint8Array(await response.arrayBuffer())`. A 404 is a value, never a throw.
- Second half: catch the error `isTimeout()` recognises and answer
  `{ status: 'timeout', timeoutMs: this._timeoutMs }`.

Why those eight bytes: they are not valid UTF-8. A client that round-trips a body through
a string turns them into U+FFFD and the equality fails. `'hello'` would have let it pass.

### 3. The off switch (20 min)

"Exercise 3". `createNull()` hands the constructor `stubbedFetch(responses)` instead of
the real fetch. Nothing else changes: `get()` runs the same lines with the world on or
off. `stubbedFetch` answers an unconfigured URL with `new Response()`, an empty 200.
Hint: the stub replaces the third party, `fetch`, never our own code. The `.invalid`
host in the tests is a tripwire: if a null ever leaks to the network, DNS fails loudly.

### 4. Configurable responses (15 min)

"Exercise 4". Each URL gets its own `ConfigurableResponses` through
`ConfigurableResponses.mapObject(responses, 'HttpClient')`: one answer repeats for ever,
an array is consumed in order, and when it runs dry `next()` throws an error that names
the URL. The word `'timeout'` makes the stub reject with `timeoutError()`, so the real
client's timeout path runs on the null too. The test that pays for all of this is
"503 then 200".

### 5. Output tracking (15 min)

"Exercise 5". `trackRequests()` returns `this._requests.createTracker()`; `get()` emits
`{ method: 'GET', url }` on the listener before fetching, so a request that times out is
recorded too. The tracker records a GET to a URL, never "fetch was called with".

### 6. Climb one level (10 min)

`retry.skeleton.ts` and `retry.exercise.ts`. `getWithRetry()` asks the client, and while
the result is retryable and a backoff remains, waits that long on the `Clock` and tries
again. The test never sleeps: `Clock.createNull()` stands still until
`advanceNulledClockAsync()` moves it, firing every wait that comes due. In the observatory,
the codebase this comes from, production's `getWithRetry()` is this same loop.

## Closing block

`contract.exercise.ts` runs production's contract list, `httpClientContract`, on your
null and on your real client against a local server. If the two answer differently, one
of those runs fails and names it. That is rule three of the EkoHacks gate contract, a
null may not drift from the real, and the subject of "What a Null Cannot See" on ekohacks.com: a null can model what passes
through it, and nothing else.

For the full day: go back to exercise 1 and delete the mocked tests, replacing each with
one on the null. The Python twin of this closing is `todo-07-delete-your-first-mock.md`
in the Oja repository, a session where two mocks turned out to be holding up dead code.

## If you fall behind

`npm run solve` copies both answer keys over the skeletons, import paths adjusted;
`npm run reset` brings the blank skeletons back.

## Take home

The wrapper shape: `create()`, `createNull()`, one narrow test, everything else on the
null. The next wrapper to write on Monday is the one at the bottom of your own system.

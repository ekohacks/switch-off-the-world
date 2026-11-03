# Workshop: switch off the world, build a Nullable HTTP client, test first

Ninety minutes, in pairs, nobody codes alone. The Python twin of `../typescript/`:
the same six steps on Oja's `HttpClient`, the wrapper every OpenAI call in that system
goes through. You leave with a wrapper shape you can reuse for every external system
you ever meet, and no mocking library in sight after exercise 1.

## Before you start

- Python 3.12 or newer and git. Clone this repository, then
  `cd python && python3 -m venv .venv && .venv/bin/pip install -r requirements.txt`.
- Run the whole set once to see the starting state:

  ```sh
  .venv/bin/python -m pytest -q
  ```

  Exercise 1 is green, the rest are red, and every red names its exercise:
  `NotImplementedError: TODO exercise 3: create_null builds an instance holding a _NullableHttpClient`.

- Run one exercise at a time while you work:

  ```sh
  .venv/bin/python -m pytest -q -k Exercise2
  ```

- One file is yours to edit: `http_client_skeleton.py`. The tests in `test_exercises.py`
  are the specification; do not edit them. The answer key is `solutions/http_client.py`,
  which is `workshop/http_client.py`, Oja's wrapper, verbatim.

## The rule of the day

Reads are configured, writes are witnessed. A wrapper that reads from the outside world
takes its answers as the `responses` of `create_null()`; a wrapper that writes exposes
`track_operation()`, which records the write as behaviour. `HttpClient` does both.

## The six exercises

### 1. The two lies (10 min, read and run)

`TestExercise1TheTwoLies`. Nothing to write. `first_word_v1` asks the client once;
`first_word_v2` asks again when the first attempt raises, a better program with the same
answer for every caller. Run and read the five verdicts: the test loyal to the call is
green on version 1, red on version 2 (`xfail(strict=True)` marks it), and stays green
while the function answers `None`. The tests on the null are green on both versions and
say what went out. Question for the pair: which refactoring would break each test?

### 2. The narrow integration test (20 min)

`TestExercise2TheNarrowTest`. The only tests in this folder allowed to open a socket: a
real `http.server` in a thread, answering per path. Make `post` and `stream` work with
`httpx.AsyncClient`:

- `post` sends the JSON with the headers and the timeout, calls `raise_for_status()`,
  and answers `response.json()`. A 503 raises; a timeout raises httpx's own error.
- `stream` opens a streaming POST, reads lines, and yields `json.loads(line[6:])` for
  every line that starts with `data: ` and is not `data: [DONE]`.

Hint: production's `post` imports `httpx` inside the method, so the null never pays for it.

### 3. The off switch (20 min)

`TestExercise3TheOffSwitch`. `create_null(responses)` builds an instance whose
`_nullable` is a `_NullableHttpClient(responses)`; `post` and `stream` answer from it when
it is set, and run the same lines otherwise. The empty null is a tripwire: with nothing
configured, any request raises `No more configured responses`, which is how a test proves
that validation fired before any I/O. See step 2 of `todo-07-delete-your-first-mock.md`
in the Oja repository.

### 4. Configurable responses (15 min)

`TestExercise4ConfigurableResponses`. `ConfigurableResponse` from
`workshop/output_tracker.py` already does the work: a list is consumed in
order, running dry raises, and a configured exception is raised instead of answered, so
error paths run on the null. A stream's response is the list of its chunks.

### 5. Output tracking (15 min)

`TestExercise5OutputTracking`. `track_operation()` returns an `OutputTracker` on the
emitter; `post` and `stream` emit `{"operation", "url", "headers", "json"}` before doing
anything, so a request that raised is recorded too.

### 6. The contract list (10 min)

`HttpClientContract` is one list of behaviour. `TestExercise6ContractOnTheNull` runs it
on your null, handed the answers the server would give; `TestExercise6ContractOnTheReal`
runs it on your real client against the local server. If the two answer differently, one
side fails and names it. This is rule three of the EkoHacks gate contract, a null may not
drift from the real, the shape every wrapper in Oja gets, and the subject of "What a
Null Cannot See" on ekohacks.com.

## Closing block

For the full day: `todo-07-delete-your-first-mock.md` in the Oja repository is the
session where Oja's own mocks were deleted, one test at a time, and three dead branches
went with them. The journal of the three sessions is beside it,
`docs/journal/2026-11-02-delete-your-first-mock-sessions.md`.

## If you fall behind

```sh
cp workshop/solutions/http_client.py workshop/http_client_skeleton.py
```

To start over: `git checkout workshop/http_client_skeleton.py`.

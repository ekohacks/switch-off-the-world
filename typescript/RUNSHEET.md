# Workshop run sheet: ninety minutes, two screens

The code on one screen, the test runner on the other, both large. The rule for the
whole block: **the room predicts before you press enter, every time.**
Pairs at tables; you walk; the runner in watch mode on your screen:
`npm run exercise:watch`.

## 0. Before they arrive (10 min)

- `npm run reset` so the skeletons are blank; `npm run exercise` once: 4 green, 27 red,
  one expected fail. Leave it on screen.
- Tabs: `mock.exercise.ts`, `httpClient.skeleton.ts`, `httpClient.exercise.ts`,
  `retry.exercise.ts`, and production's `src/httpClient.ts` closed but
  one click away.
- On the board, two headings: **loyal to** and **which refactoring breaks it**.

## 1. The two lies (0 to 10)

Open `mock.exercise.ts`. Read `sizeOfV1` and `sizeOfV2` aloud; ask what a user sees
differently between them (nothing). Predict each of the four verdicts, then run. Under
**loyal to**, write "the call" for the mocked tests and "the behaviour" for the null
ones. Land the rule of the day on the board: reads are configured, writes are witnessed.
Common question: "but the spy caught the wrong body". It did not; the function answered
`undefined` and the spy stayed green.

## 2. The narrow integration test (10 to 30)

Show the server in `httpClient.exercise.ts` and say the sentence: this is the only test
in the folder allowed to open a socket. Pairs implement `create()` and `get()`. Walk;
the mistake to watch for is `await response.text()`: it goes green on `'hello'` and red
on the eight bytes. When the first pair is green, ask them why those bytes. Second half,
the timeout: the server never answers `/slow.xls`; `AbortSignal.timeout` rejects with a
`TimeoutError`, and the result is a value with the word `timeout` where a status goes.

## 3. The off switch (30 to 50)

Ask before anyone types: "what is the third party here?" (`fetch`). `createNull()`
replaces that and nothing else. Pairs write `stubbedFetch` to answer an empty 200, and
`createNull()`. Then the question that matters: open `get()` and ask what changed in it
(nothing). The `.invalid` host: ask what happens if someone wires `create()` by mistake
(DNS fails, loudly). Parameterless instantiation: `HttpClient.createNull()` with no
arguments must work; a test should not have to know anything it does not care about.

## 4. Configurable responses (50 to 65)

Show `ConfigurableResponses.mapObject` from `src/configurableResponses.ts`, forty
lines, Shore's helper translated. One value repeats, an array is consumed, running dry
throws with the URL in the message. Pairs wire it into `stubbedFetch`, plus the
`'timeout'` word. Predict: the "runs dry loudly" test; most rooms expect the empty 200.
Say why "503 then 200" is the test that pays for all of this: it is the retry's
specification, and no mock states it this plainly.

## 5. Output tracking (65 to 80)

Open `src/outputTracker.ts`: a listener that emits, a tracker that collects. Pairs
add `trackRequests()` and the `emit` in `get()`. The retro question: "fetch was called
with" versus "a GET went to this URL". Swap fetch for undici tomorrow; which test
changes? Predict the timeout case: is a request that timed out recorded? (It went out.)

## 6. Climb one level (80 to 90)

`retry.exercise.ts`. Show `Clock.createNull()` and `advanceNulledClockAsync` in
`src/clock.ts`: time is an external system, this is its off switch. Pairs
write `getWithRetry`. Predict the trackers' lengths at each advance. The take home
sentence: the template is the shape, `create()`, `createNull()`, one narrow test; the
next wrapper to write is the one at the bottom of their own system.

## Closing block (full day only, 15 min)

Run `contract.exercise.ts` on a pair's skeleton. Ask: what would it take for the null to
answer differently from the real client? Then the story of "What a Null Cannot See": the
item that would not go green, and why it was never a contract. Then delete the mocked
tests of exercise 1, each replaced by one on the null; that is the Monday action.

## Timing, honestly

Exercise 2 is where pairs diverge; twenty minutes is the budget, and the done-when for
this material is that a pair new to the pattern completes it from the README alone. If
the room is behind at minute 50, skip exercise 6 and show production's `getWithRetry`
instead; the closing block keeps its fifteen.

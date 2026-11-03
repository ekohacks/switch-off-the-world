# Switch off the world

Build a Nullable HTTP client, test first. A ninety-minute workshop in pairs, in
TypeScript or in Python, from James Shore's
[Testing Without Mocks](https://www.jamesshore.com/v2/projects/nullables/testing-without-mocks).
You leave with a wrapper shape you can reuse for every external system you ever meet:
`create()`, `createNull()`, one narrow integration test, everything else on the null.
No mocking library in sight after exercise 1.

## Pick a language

|               | TypeScript                                                                        | Python                                                                                                              |
| ------------- | --------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------- |
| The wrapper   | the observatory's `HttpClient`, the one every Bank of Greece download goes through | Oja's `HttpClient`, the one every OpenAI call goes through                                                          |
| Before        | Node 24 and git                                                                   | Python 3.12 or newer and git                                                                                        |
| Start         | `cd typescript && npm ci && npm run exercise`                                     | `cd python && python3 -m venv .venv && .venv/bin/pip install -r requirements.txt && .venv/bin/python -m pytest -q` |
| Read          | [typescript/README.md](typescript/README.md)                                      | [python/README.md](python/README.md)                                                                                |
| For the room  | [typescript/RUNSHEET.md](typescript/RUNSHEET.md)                                  | [python/PRESENTER_NOTES.md](python/PRESENTER_NOTES.md)                                                              |

Both wrappers are the production code of the systems they come from, copied in on
3 November 2026, not toys built for the day. The first run shows the starting state:
exercise 1 green, everything else red, and every red names its exercise.

## The six steps

1. **The two lies.** Read and run. A test loyal to the call turns red on a better
   program and stays green on nonsense; a test loyal to the behaviour, on the null,
   does neither.
2. **The narrow integration test.** The only test allowed a socket: the real client
   against a real local server, including the timeout.
3. **The off switch.** `createNull()` replaces the third party, `fetch` or `httpx`,
   and nothing else. The same `get()` runs with the world on or off.
4. **Configurable responses.** One answer repeats, a sequence is consumed in order,
   running dry is loud, and an error is an answer like any other.
5. **Output tracking.** What went out, recorded as behaviour: a GET to a URL, never
   "fetch was called with".
6. **Climb one level.** TypeScript: a retry policy tested through a nulled clock, no
   sleeping. Python: the contract list, one list of behaviour run on the null and on
   the real, so a null that drifts fails.

**Closing block, full day only.** The contract list on the TypeScript side, then the
Oja session where a repository's own mocks were deleted one test at a time and three
dead production branches went with them.

The rule of the day: reads are configured, writes are witnessed.

## Where it runs

Proposed for WeTest.Athens 2027 as the 90-minute session and the full day. The week 2
lab of the EkoHacks course, from 21 November 2026.

## The gate

```sh
./gate.sh
```

Both halves: type check, format check, and a check that the blank skeletons are red
where the READMEs say and that the answer keys make every exercise green, run in a
temporary copy so your work is never touched. The pre-push hook and CI run the same
script. Once after cloning, for the hook:

```sh
git config core.hooksPath .githooks
```

## Where the code comes from

The TypeScript half is the [EkoHacks](https://ekohacks.com) observatory's, a housing
index over the Bank of Greece's open data and the codebase of the EkoHacks course. The
Python half is Oja's, EkoHacks' document platform. The pattern and the two helper
classes under `typescript/src/` are James Shore's, translated; see the third party
notices in [LICENSE](LICENSE).

## Licence

MIT, copyright EkoHacks.

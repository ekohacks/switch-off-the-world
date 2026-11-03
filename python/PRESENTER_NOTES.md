# Presenter notes: the Python workshop

The run sheet is `../typescript/RUNSHEET.md`: the same
six steps, the same timings, the same board headings, **loyal to** and **which
refactoring breaks it**. What differs in Python is below.

## Before they arrive

- `git checkout workshop/` so the skeleton is blank; `.venv/bin/python -m pytest -q`:
  4 passed, 21 failed, 1 xfailed.
- Leave a watch loop on screen if `pytest-watch` is installed; otherwise rerun by hand.

## Where the rooms diverge

- **Exercise 1.** `pytest-mock` is installed here, which is the point:
  the first exercise is the only one that imports it, and the closing block deletes it.
  The second lie needs a sentence: the mock answered `{"choices": []}`, a shape the real
  API never sends, and the call assertion stayed green while the function answered None.
- **Exercise 2.** `response.json()` inside `async with httpx.AsyncClient()` is the line
  most pairs reach for first; the stream is the one they fear. Say it plainly: read
  lines, keep the ones that start with `data: `, stop at `[DONE]`. The server's 503
  answers a body too; `raise_for_status()` is what makes it an exception.
- **Exercise 3.** Production's `create_null` goes through `__init__`; Oja's other three
  wrappers use `cls.__new__(cls)` to skip the settings. Ask why the
  HTTP wrapper can afford the simpler route (it reads no settings in `__init__`).
- **Exercise 4.** The exception-as-answer is the Python twin of the observatory's
  `'timeout'` word: the real raises, so the null must be able to raise, or the error path
  never runs on the null.
- **Exercise 6.** The contract class has no `make`; the two subclasses give it one. Ask
  what the null is handed (the server's answers, in order) and what would make the two
  sides disagree. Then the story from the post: the item that could not go green on a
  null, and why.

## Timing, honestly

Exercise 2 is the long one; the stream alone can take a pair ten minutes. If the room is
behind at minute 50, give the stream away and keep the time for exercise 6; the contract
list is the idea that outlives the day.

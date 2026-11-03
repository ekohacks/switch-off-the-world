// Time is an external system too: the Clock is HttpClient for time, the
// seconds you cannot wait for in a test. Real code reads Date.now() and
// schedules with setTimeout; that pair is the third party boundary, and it is
// what the Embedded Stub replaces. Clock's own methods run the same code
// either way. A nulled clock stands still until a test advances it
// (Behaviour Simulation), so retries and daily refreshes are tested without
// sleeping, and no test ever fakes a global timer. In the observatory it is
// the only class allowed to touch Date.

interface TimeGlobals {
  now(): number;
  setTimeout(callback: () => void, milliseconds: number): void;
}

export interface ClockNullOptions {
  now?: number;
}

export class Clock {
  static create(): Clock {
    return new Clock({
      now: () => Date.now(),
      setTimeout: (callback, milliseconds) => {
        globalThis.setTimeout(callback, milliseconds);
      },
    });
  }

  static createNull({ now = 0 }: ClockNullOptions = {}): Clock {
    return new Clock(new StubbedTimeGlobals(now));
  }

  private constructor(private readonly _globals: TimeGlobals) {}

  // Milliseconds since the Unix epoch, like Date.now().
  now(): number {
    return this._globals.now();
  }

  async waitAsync(milliseconds: number): Promise<void> {
    await new Promise<void>((resolve) => {
      this._globals.setTimeout(resolve, milliseconds);
    });
  }

  // Only meaningful on a nulled clock: move time forward, firing every wait
  // that comes due, in order, and letting the code that was waiting run
  // before the next one fires.
  async advanceNulledClockAsync(milliseconds: number): Promise<void> {
    if (!(this._globals instanceof StubbedTimeGlobals)) {
      throw new Error(
        'Clock.advanceNulledClockAsync() only works on a nulled clock',
      );
    }
    await this._globals.advanceAsync(milliseconds);
  }
}

// The one real scheduling primitive the stub relies on. It does not measure
// time; it only lets pending promise callbacks run.
function settle(): Promise<void> {
  return new Promise<void>((resolve) => {
    setImmediate(resolve);
  });
}

interface PendingTimer {
  dueAt: number;
  sequence: number;
  callback: () => void;
}

class StubbedTimeGlobals implements TimeGlobals {
  private _now: number;
  private _sequence = 0;
  private readonly _timers: PendingTimer[] = [];

  constructor(now: number) {
    this._now = now;
  }

  now(): number {
    return this._now;
  }

  setTimeout(callback: () => void, milliseconds: number): void {
    this._timers.push({
      dueAt: this._now + Math.max(0, milliseconds),
      sequence: this._sequence++,
      callback,
    });
  }

  async advanceAsync(milliseconds: number): Promise<void> {
    const target = this._now + milliseconds;
    // Let code that is already running reach its next wait before we look
    // for timers, as real time would.
    await settle();
    for (;;) {
      const next = this.nextTimerDueBy(target);
      if (next === undefined) {
        break;
      }
      this._now = next.dueAt;
      next.callback();
      // Let whoever was awaiting that timer run, and possibly schedule the
      // next one, before we look again.
      await settle();
    }
    this._now = target;
  }

  private nextTimerDueBy(target: number): PendingTimer | undefined {
    let index = -1;
    for (let i = 0; i < this._timers.length; i++) {
      const timer = this._timers[i];
      if (timer === undefined || timer.dueAt > target) {
        continue;
      }
      const best = index === -1 ? undefined : this._timers[index];
      if (
        best === undefined ||
        timer.dueAt < best.dueAt ||
        (timer.dueAt === best.dueAt && timer.sequence < best.sequence)
      ) {
        index = i;
      }
    }
    if (index === -1) {
      return undefined;
    }
    return this._timers.splice(index, 1)[0];
  }
}

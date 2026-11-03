// Output Tracking (Testing Without Mocks). An infrastructure wrapper owns an
// OutputListener<T> and emits one T per otherwise invisible write. Trackers
// created from it accumulate those Ts so tests can assert on *behaviour*
// ("a GET went to this URL"), never on which functions were called.
//
// This is Shore's Java flavour (OutputListener plus OutputTracker), typed.
// Derived from his and Ted M. Young's OutputListener/OutputTracker:
// Copyright 2022 Titanium I.T. LLC and Ted M. Young, MIT License.
// A tracker for sources we do not own (an EventEmitter, a library that
// pushes events) is deliberately absent until a story needs one.
export class OutputListener<T> {
  private readonly _trackers: OutputTracker<T>[] = [];

  createTracker(): OutputTracker<T> {
    const tracker = new OutputTracker<T>(this);
    this._trackers.push(tracker);
    return tracker;
  }

  emit(data: T): void {
    for (const tracker of this._trackers) {
      tracker.add(data);
    }
  }

  remove(tracker: OutputTracker<T>): void {
    const index = this._trackers.indexOf(tracker);
    if (index !== -1) {
      this._trackers.splice(index, 1);
    }
  }
}

export class OutputTracker<T> {
  private readonly _data: T[] = [];

  constructor(private readonly _listener: OutputListener<T>) {}

  add(data: T): void {
    this._data.push(data);
  }

  get data(): readonly T[] {
    return [...this._data];
  }

  clear(): readonly T[] {
    const result = this.data;
    this._data.length = 0;
    return result;
  }

  stop(): void {
    this._listener.remove(this);
  }
}

// Configurable Responses (Testing Without Mocks), James Shore's helper class
// translated to TypeScript. A stub configured with a single value answers it
// for ever; configured with an array it answers each in turn and throws when
// it runs out, so a test that said "503 then 200" cannot silently get a third
// answer. `name` is only used in the error message.
//
// Original JavaScript: Copyright 2023 Titanium I.T. LLC, MIT License.

export class ConfigurableResponses<T> {
  static create<T>(
    responses: T | readonly T[],
    name?: string,
  ): ConfigurableResponses<T> {
    return new ConfigurableResponses(responses, name);
  }

  // Every property of an object becomes its own ConfigurableResponses, named
  // "<name>: <key>" in errors. { '/a': 1 } becomes { '/a': create(1) }.
  static mapObject<T>(
    responseObject: Readonly<Record<string, T | readonly T[]>>,
    name?: string,
  ): Record<string, ConfigurableResponses<T>> {
    const translated: Record<string, ConfigurableResponses<T>> = {};
    for (const [key, value] of Object.entries(responseObject)) {
      const translatedName = name === undefined ? key : `${name}: ${key}`;
      translated[key] = ConfigurableResponses.create(value, translatedName);
    }
    return translated;
  }

  private readonly _description: string;
  // Either a queue (copied, so the caller's array is never mutated) or one
  // value that repeats.
  private readonly _queue: T[] | undefined;
  private readonly _single: T | undefined;

  private constructor(responses: T | readonly T[], name?: string) {
    this._description = name === undefined ? '' : ` in ${name}`;
    if (Array.isArray(responses)) {
      this._queue = [...(responses as readonly T[])];
    } else {
      this._single = responses as T;
    }
  }

  next(): T {
    const response =
      this._queue === undefined ? this._single : this._queue.shift();
    if (response === undefined) {
      throw new Error(`No more responses configured${this._description}`);
    }
    return response;
  }
}

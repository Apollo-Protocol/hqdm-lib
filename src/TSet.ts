/**
 * TSet and Eq are used to get around the limitations of TypeScript's built-in Set
 * which doesn't have well defined equality semantics, or at least the semantics
 * needed for this application
 */

import type { Maybe } from './util';

/**
 * Eq is an interface that defines the equality semantics for a type.
 */
export interface Eq<T> {
  equal(other: T): boolean;
}

/**
 * TSet is a set of Ts that implements the Eq interface.
 */
export class TSet<T extends Eq<T>> implements Iterable<T> {
  private _data: T[] = [];

  constructor(ts: T[]) {
    ts.forEach((t) => this.add(t));
  }

  /**
   * Returns an iterator for the underlying data.
   *
   * @returns An iterator for the underlying data.
   */
  [Symbol.iterator](): Iterator<T, any, undefined> {
    return this._data[Symbol.iterator]();
  }

  /**
   * Returns a new TSet that is a copy of this TSet.
   *
   * @returns A new TSet that is a copy of this TSet.
   */
  clone(): TSet<T> {
    return new TSet(this._data);
  }

  /**
   * Adds a new T to the set.
   *
   * @param t The T to add.
   */
  add(t: T): void {
    if (!this._data.some((x) => t.equal(x))) {
      this._data.push(t);
    }
  }

  /**
   * Removes a T from the set.
   *
   * @param t The T to remove.
   */
  remove(t: T): void {
    this._data = this._data.filter((x) => !t.equal(x));
  }

  /**
   * Returns true if the set contains the T.
   *
   * @param t The T to check for.
   * @returns True if the set contains the T.
   */
  has(t: T): boolean {
    return this._data.some((x) => t.equal(x));
  }

  /**
   * Returns the number of Ts in the set.
   *
   * @returns The number of Ts in the set.
   */
  get size(): number {
    return this._data.length;
  }

  /**
   * Executes a function for each T in the set.
   *
   * @param f The function to execute.
   */
  forEach(f: (r: T) => void): void {
    this._data.forEach(f);
  }

  /**
   * Returns the first T in the set that satisfies the predicate.
   *
   * @param f The predicate function.
   * @returns The first T in the set that satisfies the predicate or undefined.
   */
  first(f: (r: T) => boolean): Maybe<T> {
    for (const t of this._data) {
      const result = f(t);
      if (result) {
        return t;
      }
    }
    return undefined;
  }

  /**
   * Returns the only T in the set. Returns undefined if the set is
   * empty. Throws if the set has more than one member.
   */
  only(): Maybe<T> {
    if (this.size > 1) {
      throw new Error(`TSet.only: set has ${this.size} members`);
    }
    return this._data[0];
  }

  /**
   * Returns a new TSet of elements transformed by the function f.
   *
   * @param f The function to transform the elements.
   * @returns A new TSet of elements transformed by the function f.
   */
  map<U extends Eq<U>>(f: (r: T) => U): TSet<U> {
    return new TSet(this._data.map(f));
  }

  /**
   * Returns a new TSet of elements that satisfy the predicate.
   *
   * @param f The predicate function.
   * @returns A new TSet of elements that satisfy the predicate.
   */
  filter(f: (r: T) => boolean): TSet<T> {
    return new TSet(this._data.filter(f));
  }

  /**
   * A flatMap function that returns a new TSet of elements transformed by the function f.
   *
   * @param f The function to transform the elements.
   * @returns A new TSet of elements transformed by the function f.
   */
  fmap<U extends Eq<U>>(f: (r: T) => TSet<U>): TSet<U> {
    const setOfSets = this._data.map(f);
    const result = new TSet<U>([]);
    setOfSets.forEach((s) => s.forEach((t) => result.add(t)));
    return result;
  }
}

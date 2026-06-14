import type { Signal } from "../domain/types";

/** A collector gathers one signal for the window [windowStartMs, windowEndMs). */
export interface Collector {
  collect(windowStartMs: number, windowEndMs: number): Promise<Signal>;
}

export interface Clock {
  now(): number; // epoch ms
}

export const systemClock: Clock = { now: () => Date.now() };

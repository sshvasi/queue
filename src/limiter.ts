import type { ILimiter, LimiterOptions } from './types';

export class FixedWindowCounter implements ILimiter {
  private readonly limit: number;
  private readonly window: number;
  private count: number;
  private start: number;

  public constructor({ limit, window }: LimiterOptions) {
    this.limit = limit;
    this.window = window;
    this.count = 0;
    this.start = Date.now();
  }

  public allow(weight: number = 1): boolean {
    const now = Date.now();
    const elapsedTime = now - this.start;

    if (elapsedTime > this.window) {
      this.count = 0;
      this.start = now;
    }

    if (this.count + weight <= this.limit) {
      this.count += weight;
      return true;
    }

    return false;
  }
}

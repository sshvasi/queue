import * as timersp from 'node:timers/promises';
import { FixedWindowCounter } from './limiter';
import type { ILimiter, IQueue, QueueOptions, Task } from './types';

export class Queue<Result> implements IQueue<Result> {
  private readonly queue: {
    task: Task<Result>;
    resolve: (result: Result) => void;
    reject: (reason: unknown) => void;
  }[];
  private limiter: ILimiter;
  private concurrency: number;
  private capacity: number;
  private running: number;

  public constructor({
    concurrency = 1,
    capacity = Number.MAX_SAFE_INTEGER,
    limit = Number.MAX_SAFE_INTEGER,
    window = Number.MAX_SAFE_INTEGER,
  }: QueueOptions = {}) {
    this.queue = new Array();
    this.limiter = new FixedWindowCounter({ limit, window });
    this.concurrency = concurrency;
    this.capacity = capacity;
    this.running = 0;
  }

  public static concurrent<Result>(concurrency: number): Queue<Result> {
    return new Queue<Result>({ concurrency });
  }

  public limited(limit: number, window: number): this {
    this.limiter = new FixedWindowCounter({ limit, window });
    return this;
  }

  public capped(capacity: number): this {
    this.capacity = capacity;
    return this;
  }

  public async add(task: Task<Result>): Promise<Result> {
    return new Promise<Result>((resolve, reject) => {
      if (this.queue.length === this.capacity) {
        return void reject(new Error('queue: the queue is full'));
      }

      this.queue.push({ task, resolve, reject });
      this.execute();
    });
  }

  public async addAll(tasks: Task<Result>[]): Promise<Result[]> {
    return Promise.all(tasks.map(this.add.bind(this)));
  }

  private async execute(): Promise<void> {
    while (this.running < this.concurrency && this.queue.length > 0) {
      if (!this.limiter.allow()) {
        await timersp.setImmediate();
        continue;
      }

      const { task, resolve, reject } = this.queue.shift()!;

      try {
        this.running++;
        const result = await task();
        resolve(result);
      } catch (error: unknown) {
        reject(error);
      } finally {
        this.running--;
        this.execute();
      }
    }
  }
}

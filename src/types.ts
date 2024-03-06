export type Task<Result> =
  | (() => PromiseLike<Result>)
  | (() => Result);

export type LimiterOptions = {
  limit: number;
  window: number;
};

export type QueueOptions = Partial<LimiterOptions> & {
  concurrency?: number;
  capacity?: number;
};

export interface IQueue<Result> {
  add(task: Task<Result>): Promise<Result>;
  addAll(tasks: Task<Result>[]): Promise<Result[]>;
}

export interface ILimiter {
  allow(weight?: number): boolean;
}

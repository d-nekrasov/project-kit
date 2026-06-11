export type RateLimitStore = {
  increment(key: string, ttlMs: number): Promise<number>;
  reset(key: string): Promise<void>;
};

export const RATE_LIMIT_STORE = Symbol("RATE_LIMIT_STORE");

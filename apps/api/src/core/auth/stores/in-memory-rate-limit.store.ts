import { Inject, Injectable, Optional } from "@nestjs/common";
import { RateLimitStore } from "./rate-limit-store.interface";

type InMemoryBucket = {
  count: number;
  expiresAt: number;
};

const IN_MEMORY_RATE_LIMIT_CLOCK = "IN_MEMORY_RATE_LIMIT_CLOCK";

@Injectable()
export class InMemoryRateLimitStore implements RateLimitStore {
  private readonly buckets = new Map<string, InMemoryBucket>();

  constructor(
    @Optional()
    @Inject(IN_MEMORY_RATE_LIMIT_CLOCK)
    private readonly now: () => number = () => Date.now(),
  ) {}

  async increment(key: string, ttlMs: number): Promise<number> {
    const currentTime = this.now();
    const bucket = this.buckets.get(key);

    if (!bucket || bucket.expiresAt <= currentTime) {
      this.buckets.set(key, {
        count: 1,
        expiresAt: currentTime + ttlMs,
      });
      return 1;
    }

    bucket.count += 1;
    this.buckets.set(key, bucket);
    return bucket.count;
  }

  async reset(key: string): Promise<void> {
    this.buckets.delete(key);
  }
}

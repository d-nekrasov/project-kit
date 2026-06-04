import { Injectable } from "@nestjs/common";

type RateLimitBucket = {
  timestamps: number[];
};

@Injectable()
export class AuthRateLimitStore {
  private readonly buckets = new Map<string, RateLimitBucket>();

  consume(key: string, limit: number, ttlMs: number, now = Date.now()): boolean {
    const windowStart = now - ttlMs;
    const bucket = this.buckets.get(key);
    const timestamps = bucket?.timestamps.filter(
      (timestamp) => timestamp > windowStart,
    ) ?? [];

    if (timestamps.length >= limit) {
      if (timestamps.length > 0) {
        this.buckets.set(key, { timestamps });
      } else {
        this.buckets.delete(key);
      }
      return false;
    }

    timestamps.push(now);
    this.buckets.set(key, { timestamps });
    return true;
  }
}

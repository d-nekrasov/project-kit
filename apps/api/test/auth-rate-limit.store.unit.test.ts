import assert from "node:assert/strict";
import { test } from "node:test";

import { InMemoryRateLimitStore } from "../src/core/auth/stores/in-memory-rate-limit.store";
import { RedisRateLimitStore } from "../src/core/auth/stores/redis-rate-limit.store";

class FakeRedisClient {
  private readonly buckets = new Map<string, { count: number; expiresAt: number }>();

  constructor(private readonly now: () => number) {}

  async eval(
    _script: string,
    _keysCount: number,
    key: string,
    ttlMs: string,
  ): Promise<number> {
    const currentTime = this.now();
    const bucket = this.buckets.get(key);

    if (!bucket || bucket.expiresAt <= currentTime) {
      this.buckets.set(key, {
        count: 1,
        expiresAt: currentTime + Number(ttlMs),
      });
      return 1;
    }

    bucket.count += 1;
    return bucket.count;
  }

  async del(key: string): Promise<void> {
    this.buckets.delete(key);
  }
}

class FakeRedisService {
  readonly client: FakeRedisClient;

  constructor(now: () => number) {
    this.client = new FakeRedisClient(now);
  }

  async getCommandClient(): Promise<FakeRedisClient> {
    return this.client;
  }
}

test("InMemoryRateLimitStore increments, separates keys, and expires buckets", async () => {
  let now = 1000;
  const store = new InMemoryRateLimitStore(() => now);

  assert.equal(await store.increment("project-kit:rate-limit:login:ip-a", 500), 1);
  assert.equal(await store.increment("project-kit:rate-limit:login:ip-a", 500), 2);
  assert.equal(await store.increment("project-kit:rate-limit:setup:ip-a", 500), 1);
  assert.equal(await store.increment("project-kit:rate-limit:login:ip-b", 500), 1);

  now += 501;
  assert.equal(await store.increment("project-kit:rate-limit:login:ip-a", 500), 1);
});

test("InMemoryRateLimitStore reset clears a bucket", async () => {
  const store = new InMemoryRateLimitStore(() => 1000);

  assert.equal(await store.increment("project-kit:rate-limit:forgot:ip-a", 1000), 1);
  await store.reset("project-kit:rate-limit:forgot:ip-a");
  assert.equal(await store.increment("project-kit:rate-limit:forgot:ip-a", 1000), 1);
});

test("RedisRateLimitStore increments, preserves ttl window, expires, and resets", async () => {
  let now = 2000;
  const redisService = new FakeRedisService(() => now);
  const store = new RedisRateLimitStore(redisService as never);
  const key = "project-kit:rate-limit:reset-password:198.51.100.10";

  assert.equal(await store.increment(key, 1000), 1);
  assert.equal(await store.increment(key, 1000), 2);

  now += 1001;
  assert.equal(await store.increment(key, 1000), 1);

  await store.reset(key);
  assert.equal(await store.increment(key, 1000), 1);
});

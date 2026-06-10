import assert from "node:assert/strict";
import { test } from "node:test";

import { TokenBlacklistService } from "../src/core/auth/token-blacklist.service";
import { InMemoryTokenBlacklistStore } from "../src/core/auth/stores/in-memory-token-blacklist.store";
import { RedisTokenBlacklistStore } from "../src/core/auth/stores/redis-token-blacklist.store";

class FakeRedisClient {
  readonly setCalls: Array<[string, string, string, number]> = [];
  readonly revokedKeys = new Set<string>();

  async set(key: string, value: string, pxMode: string, ttlMs: number): Promise<void> {
    this.setCalls.push([key, value, pxMode, ttlMs]);
    this.revokedKeys.add(key);
  }

  async exists(key: string): Promise<number> {
    return this.revokedKeys.has(key) ? 1 : 0;
  }
}

class FakeRedisService {
  constructor(private readonly client: FakeRedisClient) {}

  async getCommandClient(): Promise<FakeRedisClient> {
    return this.client;
  }
}

test("InMemoryTokenBlacklistStore revokes jti values until expiration", async () => {
  let now = 1_000;
  const store = new InMemoryTokenBlacklistStore(() => now);

  await store.revoke("test-jti", 10_000);

  assert.equal(await store.isRevoked("test-jti"), true);

  now += 10_001;
  assert.equal(await store.isRevoked("test-jti"), false);
});

test("TokenBlacklistService uses token expiration delta as blacklist ttl", async () => {
  const revokeCalls: Array<{ jti: string; ttlMs: number }> = [];
  const store = {
    async revoke(jti: string, ttlMs: number): Promise<void> {
      revokeCalls.push({ jti, ttlMs });
    },
    async isRevoked(): Promise<boolean> {
      return false;
    },
  };
  const service = new TokenBlacklistService(store, () => 2_000);

  await service.revoke("ttl-jti", new Date(7_500));

  assert.deepEqual(revokeCalls, [{ jti: "ttl-jti", ttlMs: 5_500 }]);
});

test("TokenBlacklistService ignores already expired blacklist entries", async () => {
  const revokeCalls: string[] = [];
  const store = {
    async revoke(jti: string): Promise<void> {
      revokeCalls.push(jti);
    },
    async isRevoked(): Promise<boolean> {
      return false;
    },
  };
  const service = new TokenBlacklistService(store, () => 10_000);

  await service.revoke("expired-jti", new Date(9_999));

  assert.deepEqual(revokeCalls, []);
});

test("RedisTokenBlacklistStore uses SET PX and EXISTS", async () => {
  const redisClient = new FakeRedisClient();
  const store = new RedisTokenBlacklistStore(
    new FakeRedisService(redisClient) as never,
  );

  await store.revoke("redis-jti", 15_000);

  assert.deepEqual(redisClient.setCalls, [
    ["project-kit:auth:blacklist:redis-jti", "1", "PX", 15_000],
  ]);
  assert.equal(await store.isRevoked("redis-jti"), true);
  assert.equal(await store.isRevoked("other-jti"), false);
});

test("RedisTokenBlacklistStore safely ignores non-positive ttl values", async () => {
  const redisClient = new FakeRedisClient();
  const store = new RedisTokenBlacklistStore(
    new FakeRedisService(redisClient) as never,
  );

  await store.revoke("expired-jti", 0);
  await store.revoke("expired-jti", -1);

  assert.deepEqual(redisClient.setCalls, []);
});

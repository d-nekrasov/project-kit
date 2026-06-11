import assert from "node:assert/strict";
import { test } from "node:test";

import { ConfigService } from "@nestjs/config";

import { selectTokenBlacklistStore } from "../src/core/auth/select-token-blacklist-store";

const inMemoryStore = {
  revoke: async () => undefined,
  isRevoked: async () => false,
};
const redisStore = {
  revoke: async () => undefined,
  isRevoked: async () => false,
};

function createRedisService(options: {
  enabled: boolean;
  url?: string;
}): {
  isRedisEnabled(): boolean;
  getRedisUrl(): string | undefined;
} {
  return {
    isRedisEnabled(): boolean {
      return options.enabled;
    },
    getRedisUrl(): string | undefined {
      return options.url;
    },
  };
}

test("token blacklist uses in-memory store in development when Redis is disabled", () => {
  const store = selectTokenBlacklistStore(
    new ConfigService({ APP_ENV: "development" }),
    createRedisService({ enabled: false }),
    inMemoryStore,
    redisStore,
  );

  assert.equal(store, inMemoryStore);
});

test("token blacklist uses in-memory store in test when Redis is disabled", () => {
  const store = selectTokenBlacklistStore(
    new ConfigService({ APP_ENV: "test" }),
    createRedisService({ enabled: false }),
    inMemoryStore,
    redisStore,
  );

  assert.equal(store, inMemoryStore);
});

test("token blacklist uses Redis store in production when Redis is enabled", () => {
  const store = selectTokenBlacklistStore(
    new ConfigService({ APP_ENV: "production" }),
    createRedisService({ enabled: true, url: "redis://127.0.0.1:6379" }),
    inMemoryStore,
    redisStore,
  );

  assert.equal(store, redisStore);
});

test("token blacklist fails fast in production when Redis is unavailable", () => {
  assert.throws(
    () =>
      selectTokenBlacklistStore(
        new ConfigService({ APP_ENV: "production" }),
        createRedisService({ enabled: false }),
        inMemoryStore,
        redisStore,
      ),
    /Redis-backed auth token blacklist is required in production/,
  );
});

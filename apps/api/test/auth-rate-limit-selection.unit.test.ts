import assert from "node:assert/strict";
import { test } from "node:test";

import { ConfigService } from "@nestjs/config";

import { selectAuthRateLimitStore } from "../src/core/auth/select-auth-rate-limit-store";

const inMemoryStore = {
  increment: async () => 1,
  reset: async () => undefined,
};
const redisStore = {
  increment: async () => 1,
  reset: async () => undefined,
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

test("auth rate limit store uses in-memory store in development when Redis is disabled", () => {
  const store = selectAuthRateLimitStore(
    new ConfigService({ APP_ENV: "development" }),
    createRedisService({ enabled: false }),
    inMemoryStore,
    redisStore,
  );

  assert.equal(store, inMemoryStore);
});

test("auth rate limit store uses Redis store when Redis is enabled and configured", () => {
  const store = selectAuthRateLimitStore(
    new ConfigService({ APP_ENV: "production" }),
    createRedisService({ enabled: true, url: "redis://127.0.0.1:6379" }),
    inMemoryStore,
    redisStore,
  );

  assert.equal(store, redisStore);
});

test("auth rate limit store fails fast in production when Redis is unavailable", () => {
  assert.throws(
    () =>
      selectAuthRateLimitStore(
        new ConfigService({ APP_ENV: "production" }),
        createRedisService({ enabled: false }),
        inMemoryStore,
        redisStore,
      ),
    /Redis-backed auth rate limiting is required in production/,
  );
});

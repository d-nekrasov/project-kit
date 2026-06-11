import assert from "node:assert/strict";
import { test } from "node:test";

import { ConfigService } from "@nestjs/config";

import { selectCasbinWatcherMode } from "../src/infrastructure/casbin/casbin-watcher";

// Importing casbin-watcher pulls in @prisma/client, which loads .env into
// process.env; ConfigService prefers process.env over its internal config,
// so clear the keys under test to keep the scenarios deterministic.
delete process.env.APP_ENV;
delete process.env.MULTI_INSTANCE;
delete process.env.REDIS_ENABLED;
delete process.env.REDIS_URL;

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

test("casbin watcher is active when Redis is enabled", () => {
  const mode = selectCasbinWatcherMode(
    new ConfigService({ APP_ENV: "production", MULTI_INSTANCE: "true" }),
    createRedisService({ enabled: true, url: "redis://127.0.0.1:6379" }),
  );

  assert.equal(mode, "redis");
});

test("casbin watcher is disabled in development without Redis", () => {
  const mode = selectCasbinWatcherMode(
    new ConfigService({ APP_ENV: "development" }),
    createRedisService({ enabled: false }),
  );

  assert.equal(mode, "disabled");
});

test("casbin watcher is disabled in test without Redis", () => {
  const mode = selectCasbinWatcherMode(
    new ConfigService({ APP_ENV: "test" }),
    createRedisService({ enabled: false }),
  );

  assert.equal(mode, "disabled");
});

test("casbin watcher fails fast in production with MULTI_INSTANCE=true without Redis", () => {
  assert.throws(
    () =>
      selectCasbinWatcherMode(
        new ConfigService({ APP_ENV: "production", MULTI_INSTANCE: "true" }),
        createRedisService({ enabled: false }),
      ),
    /Redis-backed Casbin policy watcher is required in production with MULTI_INSTANCE=true/,
  );
});

test("casbin watcher is disabled in single-instance production without Redis", () => {
  const mode = selectCasbinWatcherMode(
    new ConfigService({ APP_ENV: "production", MULTI_INSTANCE: "false" }),
    createRedisService({ enabled: false }),
  );

  assert.equal(mode, "disabled");
});

import assert from "node:assert/strict";
import { test } from "node:test";

import { ConfigService } from "@nestjs/config";

import { RedisService } from "../src/infrastructure/redis/redis.service";

test("RedisService requires Redis in production", () => {
  const service = new RedisService(
    new ConfigService({ APP_ENV: "production", REDIS_ENABLED: "false" }),
  );

  assert.equal(service.isRedisRequired(), true);
});

test("RedisService does not require Redis in test", () => {
  const service = new RedisService(
    new ConfigService({ APP_ENV: "test", REDIS_ENABLED: "false" }),
  );

  assert.equal(service.isRedisRequired(), false);
});

test("RedisService fails fast during bootstrap in production without Redis", async () => {
  const service = new RedisService(
    new ConfigService({ APP_ENV: "production", REDIS_ENABLED: "false" }),
  );

  await assert.rejects(
    service.onModuleInit(),
    /Redis is required in production. Set REDIS_ENABLED=true and REDIS_URL./,
  );
});

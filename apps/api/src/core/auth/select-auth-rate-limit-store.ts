import { ConfigService } from "@nestjs/config";
import { RedisService } from "../../infrastructure/redis/redis.service";
import { RateLimitStore } from "./stores/rate-limit-store.interface";

export function selectAuthRateLimitStore(
  configService: ConfigService,
  redisService: Pick<RedisService, "isRedisEnabled" | "getRedisUrl">,
  inMemoryStore: RateLimitStore,
  redisStore: RateLimitStore,
): RateLimitStore {
  if (redisService.isRedisEnabled() && redisService.getRedisUrl()) {
    return redisStore;
  }

  const appEnv = (configService.get<string>("APP_ENV") ?? "development").toLowerCase();
  if (appEnv === "production") {
    throw new Error(
      "Redis-backed auth rate limiting is required in production. Set REDIS_ENABLED=true and REDIS_URL.",
    );
  }

  return inMemoryStore;
}

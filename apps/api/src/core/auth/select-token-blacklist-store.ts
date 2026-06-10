import { ConfigService } from "@nestjs/config";
import { RedisService } from "../../infrastructure/redis/redis.service";
import { TokenBlacklistStore } from "./stores/token-blacklist-store.interface";

export function selectTokenBlacklistStore(
  configService: ConfigService,
  redisService: Pick<RedisService, "isRedisEnabled" | "getRedisUrl">,
  inMemoryStore: TokenBlacklistStore,
  redisStore: TokenBlacklistStore,
): TokenBlacklistStore {
  if (redisService.isRedisEnabled() && redisService.getRedisUrl()) {
    return redisStore;
  }

  const appEnv = (configService.get<string>("APP_ENV") ?? "development").toLowerCase();
  if (appEnv === "production") {
    throw new Error(
      "Redis-backed auth token blacklist is required in production. Set REDIS_ENABLED=true and REDIS_URL.",
    );
  }

  return inMemoryStore;
}

import { Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { parseBooleanFlag } from "../../common/utils/env.util";
import { RedisService } from "../../infrastructure/redis/redis.service";
import { CurrentUserCacheStore } from "./stores/current-user-cache-store.interface";

export function selectCurrentUserCacheStore(
  configService: ConfigService,
  redisService: Pick<RedisService, "isRedisEnabled" | "getRedisUrl">,
  inMemoryStore: CurrentUserCacheStore,
  redisStore: CurrentUserCacheStore,
  logger: Pick<Logger, "warn"> = new Logger("CurrentUserCache"),
): CurrentUserCacheStore | null {
  if (redisService.isRedisEnabled() && redisService.getRedisUrl()) {
    return redisStore;
  }

  const multiInstance = parseBooleanFlag(
    configService.get<string>("MULTI_INSTANCE"),
    false,
  );
  if (multiInstance) {
    // In-memory invalidation cannot reach other instances, so caching is
    // disabled entirely instead of risking stale permissions across instances.
    logger.warn(
      "Current user cache is disabled: MULTI_INSTANCE=true requires Redis (REDIS_ENABLED=true and REDIS_URL).",
    );
    return null;
  }

  return inMemoryStore;
}

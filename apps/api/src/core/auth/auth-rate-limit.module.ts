import { Module } from "@nestjs/common";
import { RedisModule } from "../../infrastructure/redis/redis.module";
import { RedisService } from "../../infrastructure/redis/redis.service";
import { AuthRateLimitGuard } from "./guards/auth-rate-limit.guard";
import { InMemoryRateLimitStore } from "./stores/in-memory-rate-limit.store";
import { RATE_LIMIT_STORE } from "./stores/rate-limit-store.interface";
import { RedisRateLimitStore } from "./stores/redis-rate-limit.store";

@Module({
  imports: [RedisModule],
  providers: [
    AuthRateLimitGuard,
    InMemoryRateLimitStore,
    RedisRateLimitStore,
    {
      provide: RATE_LIMIT_STORE,
      inject: [RedisService, InMemoryRateLimitStore, RedisRateLimitStore],
      useFactory: (
        redisService: RedisService,
        inMemoryStore: InMemoryRateLimitStore,
        redisStore: RedisRateLimitStore,
      ) => {
        if (redisService.isRedisEnabled() && redisService.getRedisUrl()) {
          return redisStore;
        }

        return inMemoryStore;
      },
    },
  ],
  exports: [AuthRateLimitGuard, RATE_LIMIT_STORE],
})
export class AuthRateLimitModule {}

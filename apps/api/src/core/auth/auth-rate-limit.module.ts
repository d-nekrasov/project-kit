import { Module } from "@nestjs/common";
import { RedisModule } from "../../infrastructure/redis/redis.module";
import { RedisService } from "../../infrastructure/redis/redis.service";
import { AuthRateLimitGuard } from "./guards/auth-rate-limit.guard";
import { selectAuthRateLimitStore } from "./select-auth-rate-limit-store";
import { InMemoryRateLimitStore } from "./stores/in-memory-rate-limit.store";
import { RATE_LIMIT_STORE } from "./stores/rate-limit-store.interface";
import { RedisRateLimitStore } from "./stores/redis-rate-limit.store";
import { ConfigService } from "@nestjs/config";

@Module({
  imports: [RedisModule],
  providers: [
    AuthRateLimitGuard,
    InMemoryRateLimitStore,
    RedisRateLimitStore,
    {
      provide: RATE_LIMIT_STORE,
      inject: [ConfigService, RedisService, InMemoryRateLimitStore, RedisRateLimitStore],
      useFactory: (
        configService: ConfigService,
        redisService: RedisService,
        inMemoryStore: InMemoryRateLimitStore,
        redisStore: RedisRateLimitStore,
      ) => {
        return selectAuthRateLimitStore(
          configService,
          redisService,
          inMemoryStore,
          redisStore,
        );
      },
    },
  ],
  exports: [AuthRateLimitGuard, RATE_LIMIT_STORE],
})
export class AuthRateLimitModule {}

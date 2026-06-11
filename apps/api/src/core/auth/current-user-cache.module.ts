import { Module } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { RedisModule } from "../../infrastructure/redis/redis.module";
import { RedisService } from "../../infrastructure/redis/redis.service";
import { CurrentUserCacheService } from "./current-user-cache.service";
import { selectCurrentUserCacheStore } from "./select-current-user-cache-store";
import { CURRENT_USER_CACHE_STORE } from "./stores/current-user-cache-store.interface";
import { InMemoryCurrentUserCacheStore } from "./stores/in-memory-current-user-cache.store";
import { RedisCurrentUserCacheStore } from "./stores/redis-current-user-cache.store";

@Module({
  imports: [RedisModule],
  providers: [
    InMemoryCurrentUserCacheStore,
    RedisCurrentUserCacheStore,
    {
      provide: CURRENT_USER_CACHE_STORE,
      inject: [
        ConfigService,
        RedisService,
        InMemoryCurrentUserCacheStore,
        RedisCurrentUserCacheStore,
      ],
      useFactory: (
        configService: ConfigService,
        redisService: RedisService,
        inMemoryStore: InMemoryCurrentUserCacheStore,
        redisStore: RedisCurrentUserCacheStore,
      ) =>
        selectCurrentUserCacheStore(
          configService,
          redisService,
          inMemoryStore,
          redisStore,
        ),
    },
    CurrentUserCacheService,
  ],
  exports: [CurrentUserCacheService],
})
export class CurrentUserCacheModule {}

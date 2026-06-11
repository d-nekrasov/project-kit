import { Injectable } from "@nestjs/common";
import { RedisService } from "../../../infrastructure/redis/redis.service";
import { CurrentUser } from "../types/current-user.type";
import { CurrentUserCacheStore } from "./current-user-cache-store.interface";

const CURRENT_USER_CACHE_KEY_PREFIX = "project-kit:current-user:";

@Injectable()
export class RedisCurrentUserCacheStore implements CurrentUserCacheStore {
  constructor(private readonly redisService: RedisService) {}

  async get(userId: string): Promise<CurrentUser | null> {
    const client = await this.redisService.getCommandClient();
    const serialized = await client.get(this.buildKey(userId));
    if (!serialized) {
      return null;
    }

    try {
      return JSON.parse(serialized) as CurrentUser;
    } catch {
      await client.del(this.buildKey(userId));
      return null;
    }
  }

  async set(userId: string, user: CurrentUser, ttlMs: number): Promise<void> {
    if (ttlMs <= 0) {
      return;
    }

    const client = await this.redisService.getCommandClient();
    await client.set(this.buildKey(userId), JSON.stringify(user), "PX", ttlMs);
  }

  async invalidate(userId: string): Promise<void> {
    const client = await this.redisService.getCommandClient();
    await client.del(this.buildKey(userId));
  }

  async invalidateAll(): Promise<void> {
    const client = await this.redisService.getCommandClient();
    let cursor = "0";
    do {
      const [nextCursor, keys] = await client.scan(
        cursor,
        "MATCH",
        `${CURRENT_USER_CACHE_KEY_PREFIX}*`,
        "COUNT",
        100,
      );
      cursor = nextCursor;
      if (keys.length > 0) {
        await client.del(...keys);
      }
    } while (cursor !== "0");
  }

  private buildKey(userId: string): string {
    return `${CURRENT_USER_CACHE_KEY_PREFIX}${userId}`;
  }
}

import { Injectable } from "@nestjs/common";
import { RedisService } from "../../../infrastructure/redis/redis.service";
import { TokenBlacklistStore } from "./token-blacklist-store.interface";

const TOKEN_BLACKLIST_KEY_PREFIX = "project-kit:auth:blacklist:";

@Injectable()
export class RedisTokenBlacklistStore implements TokenBlacklistStore {
  constructor(private readonly redisService: RedisService) {}

  async revoke(jti: string, ttlMs: number): Promise<void> {
    if (ttlMs <= 0) {
      return;
    }

    const client = await this.redisService.getCommandClient();
    await client.set(this.buildKey(jti), "1", "PX", ttlMs);
  }

  async isRevoked(jti: string): Promise<boolean> {
    const client = await this.redisService.getCommandClient();
    return (await client.exists(this.buildKey(jti))) === 1;
  }

  private buildKey(jti: string): string {
    return `${TOKEN_BLACKLIST_KEY_PREFIX}${jti}`;
  }
}

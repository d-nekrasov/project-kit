import { Injectable } from "@nestjs/common";
import { RedisService } from "../../../infrastructure/redis/redis.service";
import { RateLimitStore } from "./rate-limit-store.interface";

const INCREMENT_WITH_TTL_SCRIPT = `
local current = redis.call("INCR", KEYS[1])
if current == 1 then
  redis.call("PEXPIRE", KEYS[1], ARGV[1])
end
return current
`;

@Injectable()
export class RedisRateLimitStore implements RateLimitStore {
  constructor(private readonly redisService: RedisService) {}

  async increment(key: string, ttlMs: number): Promise<number> {
    const client = await this.redisService.getCommandClient();
    const result = await client.eval(
      INCREMENT_WITH_TTL_SCRIPT,
      1,
      key,
      ttlMs.toString(),
    );

    return Number(result);
  }

  async reset(key: string): Promise<void> {
    const client = await this.redisService.getCommandClient();
    await client.del(key);
  }
}

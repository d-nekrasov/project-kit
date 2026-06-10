import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import Redis from "ioredis";
import { parseBooleanFlag } from "../../common/utils/env.util";

@Injectable()
export class RedisService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger("RedisService");
  private commandClient: Redis | null = null;
  private publisherClient: Redis | null = null;
  private subscriberClient: Redis | null = null;

  constructor(private readonly configService: ConfigService) {}

  async onModuleInit(): Promise<void> {
    if (this.isRedisRequired() && !this.isRedisEnabled()) {
      throw new Error(
        "Redis is required in production. Set REDIS_ENABLED=true and REDIS_URL.",
      );
    }

    if (!this.isRedisEnabled()) {
      return;
    }

    if (!this.getRedisUrl()) {
      throw new Error("REDIS_URL is required when Redis is enabled.");
    }

    const client = await this.getCommandClient();
    await client.ping();
    this.logger.log("Redis connectivity check succeeded");
  }

  async onModuleDestroy(): Promise<void> {
    await Promise.all([
      this.disconnectClient(this.commandClient),
      this.disconnectClient(this.publisherClient),
      this.disconnectClient(this.subscriberClient),
    ]);
  }

  isRedisEnabled(): boolean {
    return parseBooleanFlag(
      this.configService.get<string>("REDIS_ENABLED"),
      false,
    );
  }

  isRedisRequired(): boolean {
    return (
      (this.configService.get<string>("APP_ENV") ?? "development").toLowerCase() ===
      "production"
    );
  }

  getRedisUrl(): string | undefined {
    return this.configService.get<string>("REDIS_URL")?.trim() || undefined;
  }

  async getCommandClient(): Promise<Redis> {
    if (!this.isRedisEnabled() || !this.getRedisUrl()) {
      throw new Error("Redis command client requested while Redis is disabled.");
    }

    if (!this.commandClient) {
      this.commandClient = await this.createClient("command");
    }

    return this.commandClient;
  }

  async getPublisherClient(): Promise<Redis | null> {
    if (!this.isRedisEnabled() || !this.getRedisUrl()) {
      return null;
    }

    if (!this.publisherClient) {
      this.publisherClient = await this.createClient("publisher");
    }

    return this.publisherClient;
  }

  async getSubscriberClient(): Promise<Redis | null> {
    if (!this.isRedisEnabled() || !this.getRedisUrl()) {
      return null;
    }

    if (!this.subscriberClient) {
      this.subscriberClient = await this.createClient("subscriber");
    }

    return this.subscriberClient;
  }

  private async createClient(role: string): Promise<Redis> {
    const redisUrl = this.getRedisUrl();
    if (!redisUrl) {
      throw new Error("REDIS_URL is required when Redis is enabled.");
    }

    const client = new Redis(redisUrl, {
      lazyConnect: true,
      maxRetriesPerRequest: null,
    });

    client.on("error", (error) => {
      this.logger.error(`Redis ${role} client error: ${error.message}`);
    });

    await client.connect();
    return client;
  }

  private async disconnectClient(client: Redis | null): Promise<void> {
    if (!client) {
      return;
    }

    try {
      await client.quit();
    } catch {
      client.disconnect();
    }
  }
}

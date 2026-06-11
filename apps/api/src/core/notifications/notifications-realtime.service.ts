import {
  HttpException,
  HttpStatus,
  Injectable,
  Logger,
  ServiceUnavailableException,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { randomUUID } from "node:crypto";
import { parseIntegerEnv } from "../../common/utils/env.util";
import { RedisService } from "../../infrastructure/redis/redis.service";
import type {
  NotificationSseClient,
  NotificationSseRequest,
  NotificationSseResponse,
} from "./types/notification-realtime.types";

type RealtimeEnvelope = {
  userId: string;
  event: string;
  data: unknown;
};

const NOTIFICATIONS_REALTIME_CHANNEL = "project-kit:notifications:realtime";

@Injectable()
export class NotificationsRealtimeService {
  private readonly logger = new Logger("NotificationsRealtimeService");
  private readonly clients = new Map<
    string,
    Map<string, NotificationSseClient>
  >();
  private readonly maxClients: number;
  private readonly maxClientsPerUser: number;
  private readonly heartbeatIntervalMs: number;
  private subscriberInitialized = false;

  constructor(
    configService: ConfigService,
    private readonly redisService: RedisService,
  ) {
    this.maxClients = Math.max(
      1,
      parseIntegerEnv(configService.get<string>("SSE_MAX_CLIENTS"), 1000),
    );
    this.maxClientsPerUser = Math.max(
      1,
      parseIntegerEnv(
        configService.get<string>("SSE_MAX_CLIENTS_PER_USER"),
        5,
      ),
    );
    this.heartbeatIntervalMs = Math.max(
      1,
      parseIntegerEnv(
        configService.get<string>("SSE_HEARTBEAT_INTERVAL_MS"),
        25000,
      ),
    );
  }

  async registerClient(
    userId: string,
    request: NotificationSseRequest,
    response: NotificationSseResponse,
  ): Promise<string> {
    await this.ensureSubscriber();

    const stats = this.getStats();
    if (stats.connections >= this.maxClients) {
      this.logger.warn(
        `Rejected SSE connection: global limit reached (${stats.connections}/${this.maxClients})`,
      );
      throw new ServiceUnavailableException(
        "Notification stream is at capacity. Please try again later.",
      );
    }

    const userClients =
      this.clients.get(userId) ?? new Map<string, NotificationSseClient>();
    if (userClients.size >= this.maxClientsPerUser) {
      this.logger.warn(
        `Rejected SSE connection: per-user limit reached (${userClients.size}/${this.maxClientsPerUser})`,
      );
      throw new HttpException(
        "Too many notification streams are open for this user.",
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    const clientId = randomUUID();
    const cleanup = () => this.removeClient(userId, clientId);
    const heartbeat = setInterval(() => {
      if (response.writableEnded || response.destroyed) {
        cleanup();
        return;
      }

      try {
        response.write(": keep-alive\n\n");
      } catch {
        cleanup();
      }
    }, this.heartbeatIntervalMs);

    const client: NotificationSseClient = {
      id: clientId,
      userId,
      response,
      createdAt: new Date(),
      heartbeat,
      cleanup,
    };
    userClients.set(clientId, client);
    this.clients.set(userId, userClients);
    request.on("close", cleanup);
    request.on("error", cleanup);
    request.on("aborted", cleanup);
    response.on?.("close", cleanup);
    response.on?.("error", cleanup);
    response.on?.("finish", cleanup);
    this.logConnectionStats("accepted");
    this.writeToClient(client, "connected", { connected: true });

    return clientId;
  }

  removeClient(userId: string, clientId: string): void {
    const userClients = this.clients.get(userId);
    if (!userClients) {
      return;
    }

    const client = userClients.get(clientId);
    if (!client) {
      return;
    }

    clearInterval(client.heartbeat);
    userClients.delete(clientId);

    if (userClients.size === 0) {
      this.clients.delete(userId);
    }

    this.logConnectionStats("closed");
  }

  async publishToUser(userId: string, event: string, data: unknown): Promise<void> {
    if (this.redisService.isRedisEnabled() && this.redisService.getRedisUrl()) {
      const publisher = await this.redisService.getPublisherClient();
      await publisher?.publish(
        NOTIFICATIONS_REALTIME_CHANNEL,
        JSON.stringify({ userId, event, data } satisfies RealtimeEnvelope),
      );
      return;
    }

    this.deliverLocally(userId, event, data);
  }

  deliverLocally(userId: string, event: string, data: unknown): void {
    const userClients = this.clients.get(userId);
    if (!userClients) {
      return;
    }

    for (const client of userClients.values()) {
      this.writeToClient(client, event, data);
    }
  }

  getStats(): { users: number; connections: number } {
    let connections = 0;

    for (const userClients of this.clients.values()) {
      connections += userClients.size;
    }

    return {
      users: this.clients.size,
      connections
    };
  }

  private async ensureSubscriber(): Promise<void> {
    if (
      this.subscriberInitialized ||
      !this.redisService.isRedisEnabled() ||
      !this.redisService.getRedisUrl()
    ) {
      return;
    }

    const subscriber = await this.redisService.getSubscriberClient();
    if (!subscriber) {
      return;
    }

    await subscriber.subscribe(NOTIFICATIONS_REALTIME_CHANNEL);
    subscriber.on("message", (channel, message) => {
      if (channel !== NOTIFICATIONS_REALTIME_CHANNEL) {
        return;
      }

      try {
        const envelope = JSON.parse(message) as RealtimeEnvelope;
        this.deliverLocally(envelope.userId, envelope.event, envelope.data);
      } catch {
        this.logger.warn("Ignored malformed notification realtime message");
      }
    });
    this.subscriberInitialized = true;
  }

  private writeToClient(
    client: NotificationSseClient,
    event: string,
    data: unknown,
  ): void {
    try {
      const payload = JSON.stringify(data);
      client.response.write(`event: ${event}\n`);
      client.response.write(`data: ${payload}\n\n`);
    } catch {
      client.cleanup();
    }
  }

  private logConnectionStats(action: string): void {
    const stats = this.getStats();
    this.logger.log(
      `SSE ${action}: users=${stats.users} connections=${stats.connections}`,
    );
  }
}

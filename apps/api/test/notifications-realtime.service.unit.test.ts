import assert from "node:assert/strict";
import { EventEmitter } from "node:events";
import { test } from "node:test";

import { NotificationsRealtimeService } from "../src/core/notifications/notifications-realtime.service";
import { RealtimeEventsService } from "../src/core/realtime-events/realtime-events.service";

class FakeConfigService {
  constructor(private readonly values: Record<string, string | undefined>) {}

  get<T = string>(key: string): T | undefined {
    return this.values[key] as T | undefined;
  }
}

class FakeRedisSubscriber extends EventEmitter {
  channel: string | null = null;

  async subscribe(channel: string): Promise<void> {
    this.channel = channel;
  }
}

class FakeRedisPublisher {
  constructor(private readonly bus: EventEmitter) {}

  async publish(channel: string, message: string): Promise<void> {
    this.bus.emit("message", channel, message);
  }
}

class FakeRedisService {
  private readonly publisher: FakeRedisPublisher;
  private readonly subscriber: FakeRedisSubscriber;

  constructor(
    private readonly enabled: boolean,
    bus = new EventEmitter(),
  ) {
    this.publisher = new FakeRedisPublisher(bus);
    this.subscriber = new FakeRedisSubscriber();
    bus.on("message", (channel, message) => {
      this.subscriber.emit("message", channel, message);
    });
  }

  isRedisEnabled(): boolean {
    return this.enabled;
  }

  getRedisUrl(): string | undefined {
    return this.enabled ? "redis://local-test" : undefined;
  }

  async getPublisherClient(): Promise<FakeRedisPublisher | null> {
    return this.enabled ? this.publisher : null;
  }

  async getSubscriberClient(): Promise<FakeRedisSubscriber | null> {
    return this.enabled ? this.subscriber : null;
  }
}

class FakeSseRequest extends EventEmitter {}

class FakeSseResponse extends EventEmitter {
  readonly chunks: string[] = [];
  writableEnded = false;
  destroyed = false;
  ended = false;

  write(chunk: string): unknown {
    if (this.writableEnded || this.destroyed) {
      throw new Error("connection closed");
    }

    this.chunks.push(chunk);
    return true;
  }

  end(): unknown {
    this.ended = true;
    this.writableEnded = true;
    return this;
  }
}

class FakeTokenBlacklistService {
  readonly revokedJtis = new Set<string>();

  async isRevoked(jti: string): Promise<boolean> {
    return this.revokedJtis.has(jti);
  }
}

function createService(options?: {
  env?: Record<string, string | undefined>;
  redisEnabled?: boolean;
  redisService?: FakeRedisService;
  tokenBlacklist?: FakeTokenBlacklistService;
  realtimeEvents?: RealtimeEventsService;
}): NotificationsRealtimeService {
  return new NotificationsRealtimeService(
    new FakeConfigService(options?.env ?? {}) as never,
    (options?.redisService ??
      new FakeRedisService(options?.redisEnabled ?? false)) as never,
    (options?.tokenBlacklist ?? new FakeTokenBlacklistService()) as never,
    options?.realtimeEvents ?? new RealtimeEventsService(),
  );
}

test("NotificationsRealtimeService registers and removes clients on close", async () => {
  const service = createService();
  const request = new FakeSseRequest();
  const response = new FakeSseResponse();

  await service.registerClient("user-1", "jti-1", request as never, response as never);
  assert.deepEqual(service.getStats(), { users: 1, connections: 1 });

  request.emit("close");
  await new Promise((resolve) => setTimeout(resolve, 5));
  assert.deepEqual(service.getStats(), { users: 0, connections: 0 });
});

test("NotificationsRealtimeService rejects when global limit is reached", async () => {
  const service = createService({
    env: {
      SSE_MAX_CLIENTS: "1",
      SSE_MAX_CLIENTS_PER_USER: "2",
    },
  });
  const firstRequest = new FakeSseRequest();

  await service.registerClient("user-1", "jti-1", firstRequest as never, new FakeSseResponse() as never);

  await assert.rejects(
    service.registerClient("user-2", "jti-2", new FakeSseRequest() as never, new FakeSseResponse() as never),
    /at capacity/,
  );

  firstRequest.emit("close");
});

test("NotificationsRealtimeService rejects when per-user limit is reached", async () => {
  const service = createService({
    env: {
      SSE_MAX_CLIENTS: "10",
      SSE_MAX_CLIENTS_PER_USER: "1",
    },
  });
  const firstRequest = new FakeSseRequest();

  await service.registerClient("user-1", "jti-1", firstRequest as never, new FakeSseResponse() as never);

  await assert.rejects(
    service.registerClient("user-1", "jti-1b", new FakeSseRequest() as never, new FakeSseResponse() as never),
    /Too many notification streams/,
  );

  firstRequest.emit("close");
});

test("NotificationsRealtimeService heartbeat survives closed clients", async () => {
  const service = createService({
    env: {
      SSE_HEARTBEAT_INTERVAL_MS: "10",
    },
  });
  const request = new FakeSseRequest();
  const response = new FakeSseResponse();

  await service.registerClient("user-1", "jti-1", request as never, response as never);
  response.destroyed = true;

  await new Promise((resolve) => setTimeout(resolve, 25));
  assert.deepEqual(service.getStats(), { users: 0, connections: 0 });
});

test("NotificationsRealtimeService publishes locally to the target user", async () => {
  const service = createService();
  const userOneResponse = new FakeSseResponse();
  const userTwoResponse = new FakeSseResponse();
  const userOneRequest = new FakeSseRequest();
  const userTwoRequest = new FakeSseRequest();

  await service.registerClient("user-1", "jti-1", userOneRequest as never, userOneResponse as never);
  await service.registerClient("user-2", "jti-2", userTwoRequest as never, userTwoResponse as never);

  await service.publishToUser("user-1", "notification.created", { unreadCount: 3 });

  assert.match(userOneResponse.chunks.join(""), /notification\.created/);
  assert.doesNotMatch(userTwoResponse.chunks.join(""), /notification\.created/);

  userOneRequest.emit("close");
  userTwoRequest.emit("close");
});

test("NotificationsRealtimeService delivers events across instances through Redis pub/sub", async () => {
  const bus = new EventEmitter();
  const firstRedis = new FakeRedisService(true, bus);
  const secondRedis = new FakeRedisService(true, bus);
  const firstService = createService({ redisEnabled: true, redisService: firstRedis });
  const secondService = createService({ redisEnabled: true, redisService: secondRedis });
  const response = new FakeSseResponse();
  const request = new FakeSseRequest();

  await secondService.registerClient("user-7", "jti-7", request as never, response as never);
  await firstService.publishToUser("user-7", "notification.read", { unreadCount: 1 });
  await new Promise((resolve) => setTimeout(resolve, 5));

  assert.match(response.chunks.join(""), /notification\.read/);
  assert.match(response.chunks.join(""), /"unreadCount":1/);

  request.emit("close");
});

test("NotificationsRealtimeService closes connections of a revoked session and keeps others", async () => {
  const realtimeEvents = new RealtimeEventsService();
  const service = createService({ realtimeEvents });
  const revokedResponse = new FakeSseResponse();
  const otherSessionResponse = new FakeSseResponse();
  const otherUserResponse = new FakeSseResponse();
  const otherSessionRequest = new FakeSseRequest();
  const otherUserRequest = new FakeSseRequest();

  await service.registerClient("user-1", "jti-revoked", new FakeSseRequest() as never, revokedResponse as never);
  await service.registerClient("user-1", "jti-kept", otherSessionRequest as never, otherSessionResponse as never);
  await service.registerClient("user-2", "jti-other", otherUserRequest as never, otherUserResponse as never);

  realtimeEvents.emitSessionRevoked("jti-revoked");
  await new Promise((resolve) => setTimeout(resolve, 5));

  assert.equal(revokedResponse.ended, true);
  assert.equal(otherSessionResponse.ended, false);
  assert.equal(otherUserResponse.ended, false);
  assert.deepEqual(service.getStats(), { users: 2, connections: 2 });

  otherSessionRequest.emit("close");
  otherUserRequest.emit("close");
});

test("NotificationsRealtimeService closes all connections of a deactivated user and keeps others", async () => {
  const realtimeEvents = new RealtimeEventsService();
  const service = createService({ realtimeEvents });
  const blockedFirstResponse = new FakeSseResponse();
  const blockedSecondResponse = new FakeSseResponse();
  const otherUserResponse = new FakeSseResponse();
  const otherUserRequest = new FakeSseRequest();

  await service.registerClient("user-1", "jti-a", new FakeSseRequest() as never, blockedFirstResponse as never);
  await service.registerClient("user-1", "jti-b", new FakeSseRequest() as never, blockedSecondResponse as never);
  await service.registerClient("user-2", "jti-c", otherUserRequest as never, otherUserResponse as never);

  realtimeEvents.emitUserDeactivated("user-1");
  await new Promise((resolve) => setTimeout(resolve, 5));

  assert.equal(blockedFirstResponse.ended, true);
  assert.equal(blockedSecondResponse.ended, true);
  assert.equal(otherUserResponse.ended, false);
  assert.deepEqual(service.getStats(), { users: 1, connections: 1 });

  otherUserRequest.emit("close");
});

test("NotificationsRealtimeService propagates session disconnects across instances through Redis pub/sub", async () => {
  const bus = new EventEmitter();
  const realtimeEvents = new RealtimeEventsService();
  const firstService = createService({
    redisEnabled: true,
    redisService: new FakeRedisService(true, bus),
    realtimeEvents,
  });
  const secondService = createService({
    redisEnabled: true,
    redisService: new FakeRedisService(true, bus),
    realtimeEvents: new RealtimeEventsService(),
  });
  const remoteResponse = new FakeSseResponse();

  await firstService.registerClient("user-1", "jti-local", new FakeSseRequest() as never, new FakeSseResponse() as never);
  await secondService.registerClient("user-1", "jti-remote", new FakeSseRequest() as never, remoteResponse as never);

  // Logout handled by the first instance must close the stream held by the second one.
  realtimeEvents.emitSessionRevoked("jti-remote");
  await new Promise((resolve) => setTimeout(resolve, 5));

  assert.equal(remoteResponse.ended, true);
  assert.deepEqual(secondService.getStats(), { users: 0, connections: 0 });
  assert.deepEqual(firstService.getStats(), { users: 1, connections: 1 });

  firstService.disconnectLocally({ userId: "user-1" });
});

test("NotificationsRealtimeService heartbeat closes connections with a revoked parent session", async () => {
  const tokenBlacklist = new FakeTokenBlacklistService();
  const service = createService({
    env: {
      SSE_HEARTBEAT_INTERVAL_MS: "10",
      SSE_BLACKLIST_CHECK_INTERVAL_MS: "10",
    },
    tokenBlacklist,
  });
  const revokedResponse = new FakeSseResponse();
  const activeResponse = new FakeSseResponse();
  const activeRequest = new FakeSseRequest();

  await service.registerClient("user-1", "jti-revoked", new FakeSseRequest() as never, revokedResponse as never);
  await service.registerClient("user-1", "jti-active", activeRequest as never, activeResponse as never);

  tokenBlacklist.revokedJtis.add("jti-revoked");
  await new Promise((resolve) => setTimeout(resolve, 50));

  assert.equal(revokedResponse.ended, true);
  assert.equal(activeResponse.ended, false);
  assert.deepEqual(service.getStats(), { users: 1, connections: 1 });

  activeRequest.emit("close");
});

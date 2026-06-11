import assert from "node:assert/strict";
import { EventEmitter } from "node:events";
import { test } from "node:test";

import { ConfigService } from "@nestjs/config";

import {
  CASBIN_POLICY_EVENTS_CHANNEL,
  CasbinPolicyEvent,
  CasbinPolicyWatcher,
} from "../src/infrastructure/casbin/casbin-watcher";
import { RedisService } from "../src/infrastructure/redis/redis.service";
import { SystemLogsService } from "../src/core/system-logs/system-logs.service";

class FakeSubscriber extends EventEmitter {
  channels: string[] = [];

  async subscribe(channel: string): Promise<void> {
    this.channels.push(channel);
  }
}

class FakeBus {
  private readonly subscribers: FakeSubscriber[] = [];

  register(subscriber: FakeSubscriber): void {
    this.subscribers.push(subscriber);
  }

  deliver(channel: string, message: string): void {
    for (const subscriber of this.subscribers) {
      if (subscriber.channels.includes(channel)) {
        subscriber.emit("message", channel, message);
      }
    }
  }
}

class FakePublisher {
  published: { channel: string; message: string }[] = [];

  constructor(private readonly bus: FakeBus) {}

  async publish(channel: string, message: string): Promise<number> {
    this.published.push({ channel, message });
    this.bus.deliver(channel, message);
    return 1;
  }
}

function createFakeRedisService(bus: FakeBus): {
  redisService: RedisService;
  subscriber: FakeSubscriber;
  publisher: FakePublisher;
} {
  const subscriber = new FakeSubscriber();
  bus.register(subscriber);
  const publisher = new FakePublisher(bus);

  const redisService = {
    isRedisEnabled: () => true,
    getRedisUrl: () => "redis://127.0.0.1:6379",
    getSubscriberClient: async () => subscriber,
    getPublisherClient: async () => publisher,
  } as unknown as RedisService;

  return { redisService, subscriber, publisher };
}

function createSystemLogs(): { service: SystemLogsService; writes: unknown[] } {
  const writes: unknown[] = [];
  const service = {
    write: async (entry: unknown) => {
      writes.push(entry);
    },
  } as unknown as SystemLogsService;

  return { service, writes };
}

function flush(): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, 10));
}

test("casbin watcher publishes policy event with own instanceId", async () => {
  const bus = new FakeBus();
  const { redisService, publisher } = createFakeRedisService(bus);
  const watcher = new CasbinPolicyWatcher(
    new ConfigService({}),
    redisService,
    createSystemLogs().service,
  );

  await watcher.publishPolicyEvent({ type: "reload_role", roleId: "role-1" });

  assert.equal(publisher.published.length, 1);
  assert.equal(publisher.published[0].channel, CASBIN_POLICY_EVENTS_CHANNEL);

  const event = JSON.parse(publisher.published[0].message) as CasbinPolicyEvent;
  assert.equal(event.type, "reload_role");
  assert.equal(event.roleId, "role-1");
  assert.equal(event.instanceId, watcher.getInstanceId());
  assert.ok(event.occurredAt);
});

test("casbin watcher ignores events published by the same instance", async () => {
  const bus = new FakeBus();
  const { redisService } = createFakeRedisService(bus);
  const watcher = new CasbinPolicyWatcher(
    new ConfigService({}),
    redisService,
    createSystemLogs().service,
  );

  const received: CasbinPolicyEvent[] = [];
  await watcher.start(async (event) => {
    received.push(event);
  });

  await watcher.publishPolicyEvent({ type: "reload_all" });
  await flush();

  assert.equal(received.length, 0);
});

test("casbin watcher applies events from other instances", async () => {
  const bus = new FakeBus();
  const { redisService } = createFakeRedisService(bus);
  const watcher = new CasbinPolicyWatcher(
    new ConfigService({}),
    redisService,
    createSystemLogs().service,
  );

  const received: CasbinPolicyEvent[] = [];
  await watcher.start(async (event) => {
    received.push(event);
  });

  bus.deliver(
    CASBIN_POLICY_EVENTS_CHANNEL,
    JSON.stringify({
      type: "reload_user_org",
      userId: "user-1",
      organizationId: "org-1",
      instanceId: "other-instance",
      occurredAt: new Date().toISOString(),
    }),
  );
  await flush();

  assert.equal(received.length, 1);
  assert.equal(received[0].type, "reload_user_org");
  assert.equal(received[0].userId, "user-1");
  assert.equal(received[0].organizationId, "org-1");
});

test("casbin watcher performs full reload after subscriber reconnect", async () => {
  const bus = new FakeBus();
  const { redisService, subscriber } = createFakeRedisService(bus);
  const watcher = new CasbinPolicyWatcher(
    new ConfigService({}),
    redisService,
    createSystemLogs().service,
  );

  const received: CasbinPolicyEvent[] = [];
  await watcher.start(async (event) => {
    received.push(event);
  });

  subscriber.emit("ready");
  await flush();

  assert.equal(received.length, 1);
  assert.equal(received[0].type, "reload_all");
});

test("casbin watcher logs malformed messages without invoking the handler", async () => {
  const bus = new FakeBus();
  const { redisService } = createFakeRedisService(bus);
  const systemLogs = createSystemLogs();
  const watcher = new CasbinPolicyWatcher(
    new ConfigService({}),
    redisService,
    systemLogs.service,
  );

  const received: CasbinPolicyEvent[] = [];
  await watcher.start(async (event) => {
    received.push(event);
  });

  bus.deliver(CASBIN_POLICY_EVENTS_CHANNEL, "not-a-json");
  await flush();

  assert.equal(received.length, 0);
  assert.equal(systemLogs.writes.length, 1);
});

test("casbin watcher stays inactive without Redis in development", async () => {
  const redisService = {
    isRedisEnabled: () => false,
    getRedisUrl: () => undefined,
  } as unknown as RedisService;
  const watcher = new CasbinPolicyWatcher(
    new ConfigService({ APP_ENV: "development" }),
    redisService,
    createSystemLogs().service,
  );

  assert.equal(watcher.getMode(), "disabled");

  await watcher.start(async () => {
    throw new Error("handler must not be called");
  });
  await watcher.publishPolicyEvent({ type: "reload_all" });
});

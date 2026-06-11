import assert from "node:assert/strict";
import { EventEmitter } from "node:events";
import { resolve } from "node:path";
import { test } from "node:test";

import { ConfigService } from "@nestjs/config";

import {
  CASBIN_POLICY_EVENTS_CHANNEL,
  CasbinPolicyEvent,
  CasbinPolicyWatcher,
} from "../src/infrastructure/casbin/casbin-watcher";
import { CasbinService } from "../src/infrastructure/casbin/casbin.service";
import { PrismaService } from "../src/infrastructure/prisma/prisma.service";
import { RedisService } from "../src/infrastructure/redis/redis.service";
import { SystemLogsService } from "../src/core/system-logs/system-logs.service";

const MODEL_PATH = resolve(__dirname, "../src/infrastructure/casbin/model.conf");

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

interface FakePrismaCalls {
  roleFindMany: number;
  roleFindUnique: string[];
  userSystemRoleFindManyUserIds: (string | undefined)[];
  userOrganizationFindUnique: { userId: string; organizationId: string }[];
}

function createFakePrisma(): { prisma: PrismaService; calls: FakePrismaCalls } {
  const calls: FakePrismaCalls = {
    roleFindMany: 0,
    roleFindUnique: [],
    userSystemRoleFindManyUserIds: [],
    userOrganizationFindUnique: [],
  };

  const prisma = {
    role: {
      findMany: async () => {
        calls.roleFindMany += 1;
        return [];
      },
      findUnique: async (args: { where: { id: string } }) => {
        calls.roleFindUnique.push(args.where.id);
        return null;
      },
    },
    userSystemRole: {
      findMany: async (args?: { where?: { userId?: string } }) => {
        calls.userSystemRoleFindManyUserIds.push(args?.where?.userId);
        return [];
      },
    },
    userOrganization: {
      findMany: async () => [],
      findUnique: async (args: {
        where: { userId_organizationId: { userId: string; organizationId: string } };
      }) => {
        calls.userOrganizationFindUnique.push(args.where.userId_organizationId);
        return null;
      },
    },
  } as unknown as PrismaService;

  return { prisma, calls };
}

function createInstance(bus: FakeBus): {
  service: CasbinService;
  watcher: CasbinPolicyWatcher;
  publisher: FakePublisher;
  subscriber: FakeSubscriber;
  calls: FakePrismaCalls;
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

  const systemLogsService = {
    write: async () => undefined,
  } as unknown as SystemLogsService;

  const configService = new ConfigService({ CASBIN_MODEL_PATH: MODEL_PATH });
  const watcher = new CasbinPolicyWatcher(configService, redisService, systemLogsService);
  const { prisma, calls } = createFakePrisma();
  const service = new CasbinService(configService, prisma, systemLogsService, watcher);

  return { service, watcher, publisher, subscriber, calls };
}

function flush(): Promise<void> {
  return new Promise((resolvePromise) => setTimeout(resolvePromise, 20));
}

test("role change on instance A triggers policy reload on instance B", async () => {
  const bus = new FakeBus();
  const instanceA = createInstance(bus);
  const instanceB = createInstance(bus);

  await instanceA.service.onModuleInit();
  await instanceB.service.onModuleInit();

  await instanceA.service.reloadRolePolicies("role-1");
  await flush();

  // Instance A published the event after its local reload.
  assert.equal(instanceA.publisher.published.length, 1);
  const event = JSON.parse(instanceA.publisher.published[0].message) as CasbinPolicyEvent;
  assert.equal(event.type, "reload_role");
  assert.equal(event.roleId, "role-1");
  assert.equal(event.instanceId, instanceA.watcher.getInstanceId());

  // Instance B applied the remote event, instance A ignored its own.
  assert.deepEqual(instanceB.calls.roleFindUnique, ["role-1"]);
  assert.deepEqual(instanceA.calls.roleFindUnique, ["role-1"]);
});

test("user role changes propagate to the other instance", async () => {
  const bus = new FakeBus();
  const instanceA = createInstance(bus);
  const instanceB = createInstance(bus);

  await instanceA.service.onModuleInit();
  await instanceB.service.onModuleInit();

  await instanceA.service.reloadUserOrganizationRole("user-1", "org-1");
  await instanceA.service.reloadUserSystemRoles("user-1");
  await flush();

  assert.deepEqual(instanceB.calls.userOrganizationFindUnique, [
    { userId: "user-1", organizationId: "org-1" },
  ]);
  // onModuleInit loads all user system roles without a userId filter, the
  // remote event reloads the specific user.
  assert.deepEqual(
    instanceB.calls.userSystemRoleFindManyUserIds.filter((userId) => userId !== undefined),
    ["user-1"],
  );
});

test("subscriber reconnect triggers a full policy reload", async () => {
  const bus = new FakeBus();
  const instance = createInstance(bus);

  await instance.service.onModuleInit();
  const reloadsAfterInit = instance.calls.roleFindMany;

  instance.subscriber.emit("ready");
  await flush();

  assert.equal(instance.calls.roleFindMany, reloadsAfterInit + 1);
  // The recovery reload is local only and must not be re-published.
  assert.equal(instance.publisher.published.length, 0);
});

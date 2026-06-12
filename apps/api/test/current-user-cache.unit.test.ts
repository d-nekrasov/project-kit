import assert from "node:assert/strict";
import { test } from "node:test";

import { ConfigService } from "@nestjs/config";

import { AuthService } from "../src/core/auth/auth.service";
import { CurrentUserCacheService } from "../src/core/auth/current-user-cache.service";
import { selectCurrentUserCacheStore } from "../src/core/auth/select-current-user-cache-store";
import { InMemoryCurrentUserCacheStore } from "../src/core/auth/stores/in-memory-current-user-cache.store";
import { RedisCurrentUserCacheStore } from "../src/core/auth/stores/redis-current-user-cache.store";
import { CurrentUser } from "../src/core/auth/types/current-user.type";
import { RealtimeEventsService } from "../src/core/realtime-events/realtime-events.service";
import { RolesService } from "../src/core/roles/roles.service";
import { UsersService } from "../src/core/users/users.service";

function createCurrentUser(overrides: Partial<CurrentUser> = {}): CurrentUser {
  return {
    id: "user-1",
    email: "user@example.com",
    name: "User",
    systemRoles: [],
    organizations: [],
    ...overrides,
  };
}

class FakeRedisClient {
  readonly storage = new Map<string, string>();
  readonly setCalls: Array<[string, string, string, number]> = [];

  async get(key: string): Promise<string | null> {
    return this.storage.get(key) ?? null;
  }

  async set(
    key: string,
    value: string,
    pxMode: string,
    ttlMs: number,
  ): Promise<void> {
    this.setCalls.push([key, value, pxMode, ttlMs]);
    this.storage.set(key, value);
  }

  async del(...keys: string[]): Promise<number> {
    let deleted = 0;
    for (const key of keys) {
      if (this.storage.delete(key)) {
        deleted += 1;
      }
    }
    return deleted;
  }

  async scan(
    _cursor: string,
    _matchKeyword: string,
    pattern: string,
    _countKeyword: string,
    _count: number,
  ): Promise<[string, string[]]> {
    const prefix = pattern.replace(/\*$/, "");
    const keys = [...this.storage.keys()].filter((key) =>
      key.startsWith(prefix),
    );
    return ["0", keys];
  }
}

class FakeRedisService {
  constructor(private readonly client: FakeRedisClient) {}

  async getCommandClient(): Promise<FakeRedisClient> {
    return this.client;
  }
}

class RecordingCache {
  readonly invalidateCalls: string[] = [];
  invalidateAllCalls = 0;

  async get(): Promise<CurrentUser | null> {
    return null;
  }

  async set(): Promise<void> {
    return undefined;
  }

  async invalidate(userId: string): Promise<void> {
    this.invalidateCalls.push(userId);
  }

  async invalidateAll(): Promise<void> {
    this.invalidateAllCalls += 1;
  }
}

function createCacheService(
  ttlMs: number | string,
  store: InMemoryCurrentUserCacheStore | null,
): CurrentUserCacheService {
  return new CurrentUserCacheService(
    store,
    { get: () => String(ttlMs) } as never,
  );
}

test("InMemoryCurrentUserCacheStore returns hits and misses, expires by ttl", async () => {
  let now = 1_000;
  const store = new InMemoryCurrentUserCacheStore(() => now);
  const user = createCurrentUser();

  assert.equal(await store.get("user-1"), null);

  await store.set("user-1", user, 10_000);
  assert.deepEqual(await store.get("user-1"), user);

  now += 10_001;
  assert.equal(await store.get("user-1"), null);
});

test("InMemoryCurrentUserCacheStore invalidate and invalidateAll drop entries", async () => {
  const store = new InMemoryCurrentUserCacheStore(() => 1_000);

  await store.set("user-1", createCurrentUser(), 10_000);
  await store.set("user-2", createCurrentUser({ id: "user-2" }), 10_000);

  await store.invalidate("user-1");
  assert.equal(await store.get("user-1"), null);
  assert.notEqual(await store.get("user-2"), null);

  await store.invalidateAll();
  assert.equal(await store.get("user-2"), null);
});

test("CurrentUserCacheService is a passthrough when ttl is 0", async () => {
  const store = new InMemoryCurrentUserCacheStore(() => 1_000);
  const service = createCacheService(0, store);

  assert.equal(service.isEnabled(), false);
  await service.set("user-1", createCurrentUser());
  assert.equal(await service.get("user-1"), null);
});

test("CurrentUserCacheService is a passthrough without a store (MULTI_INSTANCE without Redis)", async () => {
  const service = createCacheService(10_000, null);

  assert.equal(service.isEnabled(), false);
  await service.set("user-1", createCurrentUser());
  assert.equal(await service.get("user-1"), null);
  await service.invalidate("user-1");
  await service.invalidateAll();
});

test("selectCurrentUserCacheStore picks redis, disables on MULTI_INSTANCE without redis, defaults to in-memory", () => {
  const inMemoryStore = new InMemoryCurrentUserCacheStore();
  const redisStore = new RedisCurrentUserCacheStore(
    new FakeRedisService(new FakeRedisClient()) as never,
  );
  const logger = { warn: () => undefined };
  // Plain stubs instead of ConfigService: importing @prisma/client loads .env,
  // whose MULTI_INSTANCE value would take precedence over the test config.
  const configWith = (multiInstance: string) =>
    ({ get: () => multiInstance }) as never;

  assert.equal(
    selectCurrentUserCacheStore(
      configWith("false"),
      { isRedisEnabled: () => true, getRedisUrl: () => "redis://localhost" },
      inMemoryStore,
      redisStore,
      logger,
    ),
    redisStore,
  );

  assert.equal(
    selectCurrentUserCacheStore(
      configWith("true"),
      { isRedisEnabled: () => false, getRedisUrl: () => undefined },
      inMemoryStore,
      redisStore,
      logger,
    ),
    null,
  );

  assert.equal(
    selectCurrentUserCacheStore(
      configWith("false"),
      { isRedisEnabled: () => false, getRedisUrl: () => undefined },
      inMemoryStore,
      redisStore,
      logger,
    ),
    inMemoryStore,
  );
});

test("RedisCurrentUserCacheStore serializes with SET PX and deserializes on get", async () => {
  const redisClient = new FakeRedisClient();
  const store = new RedisCurrentUserCacheStore(
    new FakeRedisService(redisClient) as never,
  );
  const user = createCurrentUser({
    systemRoles: ["super_admin"],
    organizations: [{ id: "org-1", name: "Org", slug: "org", role: "admin" }],
  });

  await store.set("user-1", user, 10_000);

  assert.equal(redisClient.setCalls.length, 1);
  assert.deepEqual(redisClient.setCalls[0], [
    "project-kit:current-user:user-1",
    JSON.stringify(user),
    "PX",
    10_000,
  ]);
  assert.deepEqual(await store.get("user-1"), user);
  assert.equal(await store.get("user-2"), null);
});

test("RedisCurrentUserCacheStore drops corrupted entries and supports invalidateAll", async () => {
  const redisClient = new FakeRedisClient();
  const store = new RedisCurrentUserCacheStore(
    new FakeRedisService(redisClient) as never,
  );

  redisClient.storage.set("project-kit:current-user:user-1", "{not json");
  assert.equal(await store.get("user-1"), null);
  assert.equal(redisClient.storage.has("project-kit:current-user:user-1"), false);

  await store.set("user-1", createCurrentUser(), 10_000);
  await store.set("user-2", createCurrentUser({ id: "user-2" }), 10_000);
  redisClient.storage.set("project-kit:auth:blacklist:jti-1", "1");

  await store.invalidateAll();

  assert.equal(await store.get("user-1"), null);
  assert.equal(await store.get("user-2"), null);
  assert.equal(redisClient.storage.has("project-kit:auth:blacklist:jti-1"), true);
});

function createAuthServiceWithCache(cacheService: CurrentUserCacheService) {
  const findUniqueCalls: string[] = [];
  const userRow = {
    id: "user-1",
    email: "user@example.com",
    name: "User",
    status: "ACTIVE",
    systemRoles: [],
    memberships: [],
  };
  const prisma = {
    user: {
      findUnique: async (args: { where: { id: string } }) => {
        findUniqueCalls.push(args.where.id);
        return userRow;
      },
    },
  };
  const service = new AuthService(
    prisma as never,
    {} as never,
    new ConfigService({}),
    {} as never,
    {} as never,
    {} as never,
    cacheService,
    new RealtimeEventsService(),
  );

  return { service, findUniqueCalls };
}

test("AuthService.getCurrentUserById serves repeated calls from cache and refetches after invalidation", async () => {
  let now = 1_000;
  const store = new InMemoryCurrentUserCacheStore(() => now);
  const cacheService = createCacheService(10_000, store);
  const { service, findUniqueCalls } = createAuthServiceWithCache(cacheService);

  const first = await service.getCurrentUserById("user-1");
  const second = await service.getCurrentUserById("user-1");

  assert.deepEqual(first, second);
  assert.deepEqual(findUniqueCalls, ["user-1"]);

  await cacheService.invalidate("user-1");
  await service.getCurrentUserById("user-1");
  assert.deepEqual(findUniqueCalls, ["user-1", "user-1"]);

  now += 10_001;
  await service.getCurrentUserById("user-1");
  assert.deepEqual(findUniqueCalls, ["user-1", "user-1", "user-1"]);
});

test("AuthService.getCurrentUserById always hits the database when ttl is 0", async () => {
  const store = new InMemoryCurrentUserCacheStore(() => 1_000);
  const cacheService = createCacheService(0, store);
  const { service, findUniqueCalls } = createAuthServiceWithCache(cacheService);

  await service.getCurrentUserById("user-1");
  await service.getCurrentUserById("user-1");

  assert.deepEqual(findUniqueCalls, ["user-1", "user-1"]);
});

test("UsersService.updateStatus invalidates the cached user", async () => {
  const cache = new RecordingCache();
  const updatedUser = {
    id: "user-2",
    email: "target@example.com",
    name: "Target",
    status: "BLOCKED",
    memberships: [],
    systemRoles: [],
    createdAt: new Date(),
    updatedAt: new Date(),
  };
  const prisma = {
    user: {
      findUnique: async () => ({
        id: "user-2",
        status: "ACTIVE",
        systemRoles: [],
      }),
      update: async () => updatedUser,
    },
  };
  const service = new UsersService(
    prisma as never,
    {} as never,
    { write: async () => undefined } as never,
    { notify: async () => undefined } as never,
    { write: async () => undefined } as never,
    cache as never,
    new RealtimeEventsService(),
  );
  const currentUser = createCurrentUser({
    id: "admin-1",
    systemRoles: ["super_admin"],
  });

  await service.updateStatus(
    "user-2",
    currentUser,
    "org-1",
    "BLOCKED" as never,
  );

  assert.deepEqual(cache.invalidateCalls, ["user-2"]);
});

test("UsersService.updateStatus emits a user deactivated event when blocking", async () => {
  const cache = new RecordingCache();
  const realtimeEvents = new RealtimeEventsService();
  const deactivatedUserIds: string[] = [];
  realtimeEvents.onUserDeactivated((userId) => deactivatedUserIds.push(userId));

  const buildUser = (status: string) => ({
    id: "user-2",
    email: "target@example.com",
    name: "Target",
    status,
    memberships: [],
    systemRoles: [],
    createdAt: new Date(),
    updatedAt: new Date(),
  });
  let nextStatus = "BLOCKED";
  const prisma = {
    user: {
      findUnique: async () => buildUser("ACTIVE"),
      update: async () => buildUser(nextStatus),
    },
  };
  const service = new UsersService(
    prisma as never,
    {} as never,
    { write: async () => undefined } as never,
    { notify: async () => undefined } as never,
    { write: async () => undefined } as never,
    cache as never,
    realtimeEvents,
  );
  const currentUser = createCurrentUser({
    id: "admin-1",
    systemRoles: ["super_admin"],
  });

  await service.updateStatus(
    "user-2",
    currentUser,
    "org-1",
    "BLOCKED" as never,
  );
  assert.deepEqual(deactivatedUserIds, ["user-2"]);

  nextStatus = "ACTIVE";
  await service.updateStatus(
    "user-2",
    currentUser,
    "org-1",
    "ACTIVE" as never,
  );
  assert.deepEqual(deactivatedUserIds, ["user-2"]);
});

test("RolesService.updatePermissions invalidates all cached users", async () => {
  const cache = new RecordingCache();
  const role = {
    id: "role-1",
    code: "custom_role",
    name: "Custom",
    type: "ORGANIZATION",
    organizationId: "org-1",
    permissions: [],
    _count: { userOrganizations: 0, userSystemRoles: 0 },
    createdAt: new Date(),
    updatedAt: new Date(),
  };
  const prisma = {
    role: {
      findUnique: async () => role,
    },
    $transaction: async (
      fn: (tx: unknown) => Promise<unknown>,
    ): Promise<unknown> =>
      fn({
        rolePermission: {
          deleteMany: async () => undefined,
        },
        role: {
          findUniqueOrThrow: async () => role,
        },
      }),
  };
  const service = new RolesService(
    prisma as never,
    { reloadRolePolicies: async () => undefined } as never,
    { write: async () => undefined } as never,
    cache as never,
  );
  const currentUser = createCurrentUser({
    id: "admin-1",
    systemRoles: ["super_admin"],
  });

  await service.updatePermissions(
    "role-1",
    currentUser,
    "org-1",
    { permissions: [] },
  );

  assert.equal(cache.invalidateAllCalls, 1);
});

import assert from "node:assert/strict";
import { resolve } from "node:path";
import { test } from "node:test";

import { ConfigService } from "@nestjs/config";

import { CasbinPolicyWatcher } from "../src/infrastructure/casbin/casbin-watcher";
import { CasbinService } from "../src/infrastructure/casbin/casbin.service";
import { PrismaService } from "../src/infrastructure/prisma/prisma.service";
import { RedisService } from "../src/infrastructure/redis/redis.service";
import { SystemLogsService } from "../src/core/system-logs/system-logs.service";

const MODEL_PATH = resolve(__dirname, "../src/infrastructure/casbin/model.conf");

interface FixtureRole {
  id: string;
  code: string;
  type: "SYSTEM" | "ORGANIZATION";
  organizationId: string | null;
  permissionCodes: string[];
}

interface FixtureUserOrganization {
  userId: string;
  organizationId: string;
  roleId: string;
  status: "ACTIVE" | "INACTIVE" | "BLOCKED";
}

interface Fixture {
  roles: FixtureRole[];
  userSystemRoles: { userId: string; roleId: string }[];
  userOrganizations: FixtureUserOrganization[];
}

function createFixture(): Fixture {
  return {
    roles: [
      {
        id: "role-sys-admin",
        code: "admin",
        type: "SYSTEM",
        organizationId: null,
        permissionCodes: ["users.manage"],
      },
      {
        id: "role-org1-manager",
        code: "manager",
        type: "ORGANIZATION",
        organizationId: "org-1",
        permissionCodes: ["projects.read", "projects.write"],
      },
      // Same role code as in org-1 — codes overlap across organizations.
      {
        id: "role-org2-manager",
        code: "manager",
        type: "ORGANIZATION",
        organizationId: "org-2",
        permissionCodes: ["projects.read"],
      },
    ],
    userSystemRoles: [{ userId: "user-admin", roleId: "role-sys-admin" }],
    userOrganizations: [
      { userId: "user-1", organizationId: "org-1", roleId: "role-org1-manager", status: "ACTIVE" },
      { userId: "user-1", organizationId: "org-2", roleId: "role-org2-manager", status: "ACTIVE" },
      // Inactive membership must not grant any permissions.
      { userId: "user-2", organizationId: "org-1", roleId: "role-org1-manager", status: "BLOCKED" },
    ],
  };
}

function toRoleRecord(role: FixtureRole) {
  return {
    id: role.id,
    code: role.code,
    type: role.type,
    organizationId: role.organizationId,
    permissions: role.permissionCodes.map((code) => ({ permission: { code } })),
  };
}

function createFakePrisma(fixture: Fixture): PrismaService {
  const findRole = (roleId: string) => fixture.roles.find((role) => role.id === roleId);

  return {
    role: {
      findMany: async () => fixture.roles.map(toRoleRecord),
      findUnique: async (args: { where: { id: string } }) => {
        const role = findRole(args.where.id);
        return role ? toRoleRecord(role) : null;
      },
    },
    userSystemRole: {
      findMany: async (args?: { where?: { userId?: string } }) =>
        fixture.userSystemRoles
          .filter((entry) => !args?.where?.userId || entry.userId === args.where.userId)
          .map((entry) => {
            const role = findRole(entry.roleId);
            return {
              userId: entry.userId,
              role: { code: role?.code, type: role?.type },
            };
          }),
    },
    userOrganization: {
      findMany: async (args?: { where?: { status?: string } }) =>
        fixture.userOrganizations
          .filter((entry) => !args?.where?.status || entry.status === args.where.status)
          .map((entry) => {
            const role = findRole(entry.roleId);
            return {
              userId: entry.userId,
              organizationId: entry.organizationId,
              status: entry.status,
              role: { code: role?.code, type: role?.type },
            };
          }),
      findUnique: async (args: {
        where: { userId_organizationId: { userId: string; organizationId: string } };
      }) => {
        const { userId, organizationId } = args.where.userId_organizationId;
        const entry = fixture.userOrganizations.find(
          (item) => item.userId === userId && item.organizationId === organizationId,
        );
        if (!entry) {
          return null;
        }
        const role = findRole(entry.roleId);
        return {
          userId: entry.userId,
          organizationId: entry.organizationId,
          status: entry.status,
          role: { code: role?.code, type: role?.type },
        };
      },
    },
  } as unknown as PrismaService;
}

function createService(fixture: Fixture): CasbinService {
  const configService = new ConfigService({ CASBIN_MODEL_PATH: MODEL_PATH });
  const redisService = {
    isRedisEnabled: () => false,
    getRedisUrl: () => "",
  } as unknown as RedisService;
  const systemLogsService = {
    write: async () => undefined,
  } as unknown as SystemLogsService;
  const watcher = new CasbinPolicyWatcher(configService, redisService, systemLogsService);

  return new CasbinService(configService, createFakePrisma(fixture), systemLogsService, watcher);
}

async function snapshotEnforcerState(
  service: CasbinService,
): Promise<{ policies: string[]; groupings: string[] }> {
  const enforcer = service.getEnforcer();
  const policies = (await enforcer.getPolicy()).map((rule) => rule.join("|")).sort();
  const groupings = (await enforcer.getGroupingPolicy()).map((rule) => rule.join("|")).sort();
  return { policies, groupings };
}

async function assertFixtureEnforceResults(service: CasbinService): Promise<void> {
  // Active membership in org-1 grants both permissions of the org-1 manager role.
  assert.equal(await service.enforce("user-1", "org-1", "projects", "read"), true);
  assert.equal(await service.enforce("user-1", "org-1", "projects", "write"), true);

  // The org-2 role shares the code "manager" but has fewer permissions.
  assert.equal(await service.enforce("user-1", "org-2", "projects", "read"), true);
  assert.equal(await service.enforce("user-1", "org-2", "projects", "write"), false);

  // System role applies in any domain.
  assert.equal(await service.enforce("user-admin", "org-1", "users", "manage"), true);
  assert.equal(await service.enforce("user-admin", "org-2", "users", "manage"), true);
  assert.equal(await service.enforce("user-1", "org-1", "users", "manage"), false);

  // Inactive membership grants nothing.
  assert.equal(await service.enforce("user-2", "org-1", "projects", "read"), false);
  assert.equal(await service.enforce("user-2", "org-1", "projects", "write"), false);
}

test("reloadAllPolicies loads the expected enforce() decisions", async () => {
  const service = createService(createFixture());

  await service.reloadAllPolicies();
  await assertFixtureEnforceResults(service);

  const { policies, groupings } = await snapshotEnforcerState(service);
  assert.deepEqual(policies, [
    "role:admin|*|users|manage",
    "role:manager|org-1|projects|read",
    "role:manager|org-1|projects|write",
    "role:manager|org-2|projects|read",
  ]);
  assert.deepEqual(groupings, [
    "user-1|role:manager|org-1",
    "user-1|role:manager|org-2",
    "user-admin|role:admin|system",
  ]);

  const stats = service.getStats();
  assert.equal(stats.ready, true);
  assert.equal(stats.rolePolicyCacheSize, 3);
  assert.equal(stats.userOrganizationGroupingCacheSize, 2);
  assert.equal(stats.userSystemGroupingCacheSize, 1);
});

test("double reloadAllPolicies does not duplicate policies", async () => {
  const service = createService(createFixture());

  await service.reloadAllPolicies();
  const first = await snapshotEnforcerState(service);

  await service.reloadAllPolicies();
  const second = await snapshotEnforcerState(service);

  assert.deepEqual(second, first);
  await assertFixtureEnforceResults(service);
});

test("reloadRolePolicies after a full reload replaces the role's policies", async () => {
  const fixture = createFixture();
  const service = createService(fixture);

  await service.reloadAllPolicies();
  assert.equal(await service.enforce("user-1", "org-1", "projects", "write"), true);

  const org1Manager = fixture.roles.find((role) => role.id === "role-org1-manager");
  assert.ok(org1Manager);
  org1Manager.permissionCodes = ["projects.read"];

  await service.reloadRolePolicies("role-org1-manager");

  assert.equal(await service.enforce("user-1", "org-1", "projects", "read"), true);
  assert.equal(await service.enforce("user-1", "org-1", "projects", "write"), false);

  // Other roles and groupings stay untouched.
  assert.equal(await service.enforce("user-1", "org-2", "projects", "read"), true);
  assert.equal(await service.enforce("user-admin", "org-1", "users", "manage"), true);

  const { policies } = await snapshotEnforcerState(service);
  assert.deepEqual(policies, [
    "role:admin|*|users|manage",
    "role:manager|org-1|projects|read",
    "role:manager|org-2|projects|read",
  ]);
});

import assert from 'node:assert/strict';
import { test } from 'node:test';
import { InstallerService } from '../src/core/installer/installer.service';

const baseDto = {
  appName: 'Project Kit',
  organizationName: 'Default Organization',
  organizationSlug: 'default',
  adminEmail: 'admin@example.com',
  adminPassword: 'AdminPassword123!',
  adminName: 'Admin'
};

function createServiceHarness() {
  const createdSettings: Array<{
    key: string;
    value: unknown;
    scope: string;
    organizationId: string | null;
    moduleCode: string | null;
  }> = [];

  const tx = {
    $executeRaw: async () => 1,
    installation: {
      findFirst: async () => null,
      create: async () => ({ id: 'installation-1' }),
      update: async () => ({ id: 'installation-1' })
    },
    user: {
      findUnique: async () => null,
      create: async ({ data }: { data: { email: string; name: string } }) => ({
        id: 'user-1',
        email: data.email,
        name: data.name
      })
    },
    organization: {
      findUnique: async () => null,
      create: async ({ data }: { data: { name: string; slug: string } }) => ({
        id: 'org-1',
        name: data.name,
        slug: data.slug
      })
    },
    permission: {
      upsert: async () => undefined,
      findMany: async ({ where }: { where: { code: { in: string[] } } }) =>
        where.code.in.map((code) => ({ id: `perm-${code}`, code }))
    },
    role: {
      findFirst: async () => null,
      create: async () => ({ id: 'role-super-admin' }),
      update: async () => ({ id: 'role-super-admin' }),
      upsert: async ({ create }: { create: { code: string } }) => ({
        id: `role-${create.code}`
      })
    },
    rolePermission: {
      createMany: async () => undefined
    },
    userSystemRole: {
      create: async () => undefined
    },
    userOrganization: {
      create: async () => undefined
    },
    setting: {
      findFirst: async () => null,
      create: async ({
        data
      }: {
        data: {
          key: string;
          value: unknown;
          scope: string;
          organizationId: string | null;
          moduleCode: string | null;
        };
      }) => {
        createdSettings.push(data);
        return { id: `setting-${data.key}`, ...data };
      },
      update: async () => undefined
    }
  };

  const prisma = {
    installation: { findFirst: async () => null },
    user: { findUnique: async () => null },
    organization: { findUnique: async () => null },
    $transaction: async <T>(callback: (client: typeof tx) => Promise<T>) => callback(tx)
  };

  const service = new InstallerService(
    prisma as any,
    { reloadAllPolicies: async () => undefined } as any,
    { write: async () => undefined } as any,
    { syncSuperAdminPermissions: async () => undefined } as any
  );

  return { service, createdSettings };
}

test('InstallerService stores explicitly selected locale in global settings', async () => {
  const { service, createdSettings } = createServiceHarness();

  await service.setup({ ...baseDto, locale: 'en' });

  assert.deepEqual(createdSettings.find((setting) => setting.key === 'system.locale'), {
    key: 'system.locale',
    value: 'en',
    scope: 'GLOBAL',
    organizationId: null,
    moduleCode: null
  });
});

test('InstallerService defaults locale to ru when locale is omitted', async () => {
  const { service, createdSettings } = createServiceHarness();

  await service.setup(baseDto);

  assert.deepEqual(createdSettings.find((setting) => setting.key === 'system.locale'), {
    key: 'system.locale',
    value: 'ru',
    scope: 'GLOBAL',
    organizationId: null,
    moduleCode: null
  });
});

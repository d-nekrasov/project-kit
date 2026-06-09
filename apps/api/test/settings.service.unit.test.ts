import assert from 'node:assert/strict';
import { test } from 'node:test';
import { BadRequestException } from '@nestjs/common';
import { SettingScope } from '@prisma/client';

import { SettingsService } from '../src/core/settings/settings.service';

function createServiceHarness(existingValue?: unknown) {
  const created: Array<{ value: unknown }> = [];
  const updated: Array<{ value: unknown }> = [];

  const existingSetting =
    existingValue === undefined
      ? []
      : [
          {
            id: 'setting-1',
            key: 'system.locale',
            value: existingValue,
            scope: SettingScope.GLOBAL,
            organizationId: null,
            moduleCode: null,
            createdAt: new Date('2026-06-09T00:00:00.000Z'),
            updatedAt: new Date('2026-06-09T00:00:00.000Z')
          }
        ];

  const tx = {
    setting: {
      findMany: async () => existingSetting,
      update: async ({ data }: { data: { value: unknown } }) => {
        updated.push(data);
        return {
          ...existingSetting[0],
          value: data.value,
          updatedAt: new Date('2026-06-09T00:10:00.000Z')
        };
      },
      create: async ({
        data
      }: {
        data: {
          key: string;
          value: unknown;
          scope: SettingScope;
          organizationId: string | null;
          moduleCode: string | null;
        };
      }) => {
        created.push({ value: data.value });
        return {
          id: 'setting-created',
          ...data,
          createdAt: new Date('2026-06-09T00:10:00.000Z'),
          updatedAt: new Date('2026-06-09T00:10:00.000Z')
        };
      }
    }
  };

  const prisma = {
    $transaction: async <T>(callback: (client: typeof tx) => Promise<T>) => callback(tx)
  };

  const service = new SettingsService(prisma as never, { write: async () => undefined } as never);

  return { service, created, updated };
}

const superAdminUser = {
  id: 'user-1',
  systemRoles: ['super_admin']
};

const organization = {
  id: 'org-1'
};

test('SettingsService accepts supported system.locale values', async () => {
  const createHarness = createServiceHarness();
  const createdRu = await createHarness.service.upsert(
    'system.locale',
    { scope: SettingScope.GLOBAL, value: 'ru' },
    superAdminUser as never,
    organization as never
  );

  assert.equal(createdRu.value, 'ru');
  assert.deepEqual(createHarness.created, [{ value: 'ru' }]);

  const updateHarness = createServiceHarness('ru');
  const updatedEn = await updateHarness.service.upsert(
    'system.locale',
    { scope: SettingScope.GLOBAL, value: ' EN ' },
    superAdminUser as never,
    organization as never
  );

  assert.equal(updatedEn.value, 'en');
  assert.deepEqual(updateHarness.updated, [{ value: 'en' }]);

  const legacyQuotedHarness = createServiceHarness('ru');
  const updatedQuotedEn = await legacyQuotedHarness.service.upsert(
    'system.locale',
    { scope: SettingScope.GLOBAL, value: '"en"' },
    superAdminUser as never,
    organization as never
  );

  assert.equal(updatedQuotedEn.value, 'en');
  assert.deepEqual(legacyQuotedHarness.updated, [{ value: 'en' }]);
});

test('SettingsService rejects unsupported system.locale values', async () => {
  const { service, created, updated } = createServiceHarness();

  await assert.rejects(
    () =>
      service.upsert(
        'system.locale',
        { scope: SettingScope.GLOBAL, value: 'de' },
        superAdminUser as never,
        organization as never
      ),
    (error: unknown) => {
      assert.ok(error instanceof BadRequestException);
      assert.equal(error.message, 'system.locale must be one of: ru, en');
      return true;
    }
  );

  assert.deepEqual(created, []);
  assert.deepEqual(updated, []);
});

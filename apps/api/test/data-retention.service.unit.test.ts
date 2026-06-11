import assert from 'node:assert/strict';
import { test } from 'node:test';
import { NotificationStatus } from '@prisma/client';

import {
  DEFAULT_RETENTION_AUDIT_LOGS_DAYS,
  DEFAULT_RETENTION_CLEANUP_BATCH_SIZE,
  DEFAULT_RETENTION_CLEANUP_INTERVAL_MS,
  DEFAULT_RETENTION_NOTIFICATIONS_DAYS,
  DEFAULT_RETENTION_SYSTEM_LOGS_DAYS
} from '../src/core/data-retention/constants/data-retention.constants';
import { DataRetentionService } from '../src/core/data-retention/data-retention.service';

interface FindManyCall {
  where: Record<string, unknown>;
  take: number;
}

function createDelegate(batches: Array<Array<{ id: string }>>, failOnFind = false) {
  const findManyCalls: FindManyCall[] = [];
  const deletedIds: string[][] = [];
  let batchIndex = 0;

  return {
    findManyCalls,
    deletedIds,
    delegate: {
      findMany: async (args: FindManyCall) => {
        if (failOnFind) {
          throw new Error('boom');
        }
        findManyCalls.push(args);
        const batch = batches[batchIndex] ?? [];
        batchIndex += 1;
        return batch;
      },
      deleteMany: async ({ where }: { where: { id: { in: string[] } } }) => {
        deletedIds.push(where.id.in);
        return { count: where.id.in.length };
      }
    }
  };
}

function createHarness(options?: {
  env?: Record<string, string>;
  locked?: boolean;
  systemLogBatches?: Array<Array<{ id: string }>>;
  auditLogBatches?: Array<Array<{ id: string }>>;
  notificationBatches?: Array<Array<{ id: string }>>;
  tokenBatches?: Array<Array<{ id: string }>>;
  failSystemLogs?: boolean;
}) {
  const env = options?.env ?? {};
  const locked = options?.locked ?? true;

  const systemLog = createDelegate(options?.systemLogBatches ?? [[]], options?.failSystemLogs);
  const auditLog = createDelegate(options?.auditLogBatches ?? [[]]);
  const notification = createDelegate(options?.notificationBatches ?? [[]]);
  const passwordResetToken = createDelegate(options?.tokenBatches ?? [[]]);

  let lockAttempts = 0;
  const tx = {
    $queryRaw: async () => {
      lockAttempts += 1;
      return [{ locked }];
    }
  };

  const prisma = {
    systemLog: systemLog.delegate,
    auditLog: auditLog.delegate,
    notification: notification.delegate,
    passwordResetToken: passwordResetToken.delegate,
    $transaction: async <T>(callback: (client: typeof tx) => Promise<T>) => callback(tx)
  };

  const writtenLogs: Array<{ level: string; message: string; context?: Record<string, unknown> }> = [];
  const systemLogsService = {
    write: async (dto: { level: string; message: string; context?: Record<string, unknown> }) => {
      writtenLogs.push(dto);
    }
  };

  const configService = {
    get: (key: string) => env[key]
  };

  const service = new DataRetentionService(
    prisma as never,
    configService as never,
    systemLogsService as never
  );

  return {
    service,
    systemLog,
    auditLog,
    notification,
    passwordResetToken,
    writtenLogs,
    getLockAttempts: () => lockAttempts
  };
}

test('DataRetentionService resolves defaults when env is not set', () => {
  const { service } = createHarness();
  const config = service.resolveConfig();

  assert.equal(config.systemLogsDays, DEFAULT_RETENTION_SYSTEM_LOGS_DAYS);
  assert.equal(config.auditLogsDays, DEFAULT_RETENTION_AUDIT_LOGS_DAYS);
  assert.equal(config.notificationsDays, DEFAULT_RETENTION_NOTIFICATIONS_DAYS);
  assert.equal(config.cleanupIntervalMs, DEFAULT_RETENTION_CLEANUP_INTERVAL_MS);
  assert.equal(config.batchSize, DEFAULT_RETENTION_CLEANUP_BATCH_SIZE);
});

test('DataRetentionService resolves values from env and falls back on invalid input', () => {
  const { service } = createHarness({
    env: {
      RETENTION_SYSTEM_LOGS_DAYS: '7',
      RETENTION_AUDIT_LOGS_DAYS: '0',
      RETENTION_NOTIFICATIONS_DAYS: 'not-a-number',
      RETENTION_CLEANUP_INTERVAL_MS: '60000',
      RETENTION_CLEANUP_BATCH_SIZE: '100'
    }
  });
  const config = service.resolveConfig();

  assert.equal(config.systemLogsDays, 7);
  assert.equal(config.auditLogsDays, 0);
  assert.equal(config.notificationsDays, DEFAULT_RETENTION_NOTIFICATIONS_DAYS);
  assert.equal(config.cleanupIntervalMs, 60000);
  assert.equal(config.batchSize, 100);
});

test('DataRetentionService computes cutoff dates from retention days', () => {
  const { service } = createHarness();
  const now = new Date('2026-06-11T12:00:00.000Z');

  assert.deepEqual(service.computeCutoff(90, now), new Date('2026-03-13T12:00:00.000Z'));
  assert.deepEqual(service.computeCutoff(1, now), new Date('2026-06-10T12:00:00.000Z'));
});

test('DataRetentionService skips disabled entities when retention is 0', async () => {
  const harness = createHarness({
    env: {
      RETENTION_SYSTEM_LOGS_DAYS: '0',
      RETENTION_AUDIT_LOGS_DAYS: '0',
      RETENTION_NOTIFICATIONS_DAYS: '0'
    }
  });

  const summary = await harness.service.runCleanup();

  assert.ok(summary);
  assert.equal(harness.systemLog.findManyCalls.length, 0);
  assert.equal(harness.auditLog.findManyCalls.length, 0);
  assert.equal(harness.notification.findManyCalls.length, 0);
  // Password reset token cleanup is always on.
  assert.equal(harness.passwordResetToken.findManyCalls.length, 1);
  assert.deepEqual(summary.deleted, { passwordResetTokens: 0 });
});

test('DataRetentionService deletes in batches until an empty batch and respects batch size', async () => {
  const batch = (prefix: string, size: number) =>
    Array.from({ length: size }, (_, index) => ({ id: `${prefix}-${index}` }));

  const harness = createHarness({
    env: { RETENTION_CLEANUP_BATCH_SIZE: '3' },
    systemLogBatches: [batch('a', 3), batch('b', 3), []]
  });

  const summary = await harness.service.runCleanup();

  assert.ok(summary);
  assert.equal(harness.systemLog.findManyCalls.length, 3);
  for (const call of harness.systemLog.findManyCalls) {
    assert.equal(call.take, 3);
  }
  assert.equal(harness.systemLog.deletedIds.length, 2);
  assert.equal(summary.deleted.systemLogs, 6);
});

test('DataRetentionService skips the run when the advisory lock is not acquired', async () => {
  const harness = createHarness({ locked: false });

  const summary = await harness.service.runCleanup();

  assert.equal(summary, null);
  assert.equal(harness.getLockAttempts(), 1);
  assert.equal(harness.systemLog.findManyCalls.length, 0);
  assert.equal(harness.passwordResetToken.findManyCalls.length, 0);
  assert.deepEqual(harness.writtenLogs, []);
});

test('DataRetentionService deletes only READ notifications older than the cutoff', async () => {
  const harness = createHarness({
    notificationBatches: [[{ id: 'n-1' }, { id: 'n-2' }], []]
  });

  const summary = await harness.service.runCleanup();

  assert.ok(summary);
  assert.equal(summary.deleted.notifications, 2);
  assert.deepEqual(harness.notification.deletedIds, [['n-1', 'n-2']]);

  for (const call of harness.notification.findManyCalls) {
    const where = call.where as { status: NotificationStatus; createdAt: { lt: Date } };
    assert.equal(where.status, NotificationStatus.READ);
    assert.ok(where.createdAt.lt instanceof Date);
    assert.ok(where.createdAt.lt.getTime() < Date.now());
  }
});

test('DataRetentionService continues with other entities when one step fails', async () => {
  const harness = createHarness({
    failSystemLogs: true,
    auditLogBatches: [[{ id: 'a-1' }], []]
  });

  const summary = await harness.service.runCleanup();

  assert.ok(summary);
  assert.deepEqual(summary.errors, ['systemLogs']);
  assert.equal(summary.deleted.systemLogs, undefined);
  assert.equal(summary.deleted.auditLogs, 1);
  assert.equal(summary.deleted.passwordResetTokens, 0);

  const errorLog = harness.writtenLogs.find((log) => log.level === 'ERROR');
  assert.ok(errorLog);
  assert.equal(errorLog.context?.entity, 'systemLogs');

  const summaryLog = harness.writtenLogs.find((log) => log.level === 'INFO');
  assert.ok(summaryLog);
  assert.deepEqual(summaryLog.context?.errors, ['systemLogs']);
});

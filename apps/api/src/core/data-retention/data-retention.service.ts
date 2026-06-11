import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NotificationStatus, Prisma, SystemLogLevel } from '@prisma/client';
import { parseIntegerEnv } from '../../common/utils/env.util';
import { PrismaService } from '../../infrastructure/prisma/prisma.service';
import { SYSTEM_LOG_EVENTS } from '../system-logs/constants/system-log-events.constants';
import { SYSTEM_LOG_SOURCES } from '../system-logs/constants/system-log-sources.constants';
import { SystemLogsService } from '../system-logs/system-logs.service';
import {
  DATA_RETENTION_BATCH_PAUSE_MS,
  DATA_RETENTION_LOCK_KEY,
  DATA_RETENTION_LOCK_MAX_WAIT_MS,
  DATA_RETENTION_LOCK_TIMEOUT_MS,
  DEFAULT_RETENTION_AUDIT_LOGS_DAYS,
  DEFAULT_RETENTION_CLEANUP_BATCH_SIZE,
  DEFAULT_RETENTION_CLEANUP_INTERVAL_MS,
  DEFAULT_RETENTION_NOTIFICATIONS_DAYS,
  DEFAULT_RETENTION_SYSTEM_LOGS_DAYS,
  PASSWORD_RESET_TOKEN_RETENTION_DAYS
} from './constants/data-retention.constants';

export interface DataRetentionConfig {
  systemLogsDays: number;
  auditLogsDays: number;
  notificationsDays: number;
  cleanupIntervalMs: number;
  batchSize: number;
}

export interface DataRetentionRunSummary {
  deleted: Record<string, number>;
  errors: string[];
  durationMs: number;
}

@Injectable()
export class DataRetentionService implements OnModuleInit, OnModuleDestroy {
  private cleanupTimer: NodeJS.Timeout | null = null;
  private isRunning = false;

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
    private readonly systemLogsService: SystemLogsService
  ) {}

  onModuleInit(): void {
    const config = this.resolveConfig();
    if (config.cleanupIntervalMs <= 0) {
      return;
    }

    void this.runCleanup();

    this.cleanupTimer = setInterval(() => {
      void this.runCleanup();
    }, config.cleanupIntervalMs);
    this.cleanupTimer.unref();
  }

  onModuleDestroy(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = null;
    }
  }

  resolveConfig(): DataRetentionConfig {
    return {
      systemLogsDays: this.readNonNegativeEnv(
        'RETENTION_SYSTEM_LOGS_DAYS',
        DEFAULT_RETENTION_SYSTEM_LOGS_DAYS
      ),
      auditLogsDays: this.readNonNegativeEnv(
        'RETENTION_AUDIT_LOGS_DAYS',
        DEFAULT_RETENTION_AUDIT_LOGS_DAYS
      ),
      notificationsDays: this.readNonNegativeEnv(
        'RETENTION_NOTIFICATIONS_DAYS',
        DEFAULT_RETENTION_NOTIFICATIONS_DAYS
      ),
      cleanupIntervalMs: this.readNonNegativeEnv(
        'RETENTION_CLEANUP_INTERVAL_MS',
        DEFAULT_RETENTION_CLEANUP_INTERVAL_MS
      ),
      batchSize: Math.max(
        1,
        this.readNonNegativeEnv('RETENTION_CLEANUP_BATCH_SIZE', DEFAULT_RETENTION_CLEANUP_BATCH_SIZE)
      )
    };
  }

  computeCutoff(days: number, now: Date = new Date()): Date {
    return new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
  }

  /**
   * Runs one cleanup pass. Returns the summary, or null when the run was
   * skipped (another instance holds the advisory lock or a run is already
   * in progress in this process). Never throws.
   */
  async runCleanup(): Promise<DataRetentionRunSummary | null> {
    if (this.isRunning) {
      return null;
    }
    this.isRunning = true;

    try {
      let summary: DataRetentionRunSummary | null = null;

      // The interactive transaction only pins one pooled connection that holds
      // the advisory xact lock for the duration of the run; the batched deletes
      // below run in autocommit mode, so no long write transaction is kept open.
      await this.prisma.$transaction(
        async (tx) => {
          const locked = await this.tryAcquireLock(tx);
          if (!locked) {
            return;
          }
          summary = await this.executeCleanup();
        },
        { maxWait: DATA_RETENTION_LOCK_MAX_WAIT_MS, timeout: DATA_RETENTION_LOCK_TIMEOUT_MS }
      );

      return summary;
    } catch (error) {
      await this.systemLogsService.write({
        level: SystemLogLevel.ERROR,
        source: SYSTEM_LOG_SOURCES.DATA_RETENTION,
        message: 'Data retention cleanup run failed',
        context: { event: SYSTEM_LOG_EVENTS.DATA_RETENTION_RUN_FAILED },
        errorStack: error instanceof Error ? error.stack ?? error.message : String(error)
      });
      return null;
    } finally {
      this.isRunning = false;
    }
  }

  private async tryAcquireLock(tx: Prisma.TransactionClient): Promise<boolean> {
    const rows = await tx.$queryRaw<Array<{ locked: boolean }>>`
      SELECT pg_try_advisory_xact_lock(hashtext(${DATA_RETENTION_LOCK_KEY})) AS locked
    `;
    return rows[0]?.locked === true;
  }

  private async executeCleanup(): Promise<DataRetentionRunSummary> {
    const startedAt = Date.now();
    const now = new Date();
    const config = this.resolveConfig();

    const deleted: Record<string, number> = {};
    const errors: string[] = [];

    const steps: Array<{ entity: string; enabled: boolean; run: () => Promise<number> }> = [
      {
        entity: 'systemLogs',
        enabled: config.systemLogsDays > 0,
        run: () => this.cleanupSystemLogs(this.computeCutoff(config.systemLogsDays, now), config.batchSize)
      },
      {
        entity: 'auditLogs',
        enabled: config.auditLogsDays > 0,
        run: () => this.cleanupAuditLogs(this.computeCutoff(config.auditLogsDays, now), config.batchSize)
      },
      {
        entity: 'notifications',
        enabled: config.notificationsDays > 0,
        run: () =>
          this.cleanupNotifications(this.computeCutoff(config.notificationsDays, now), config.batchSize)
      },
      {
        entity: 'passwordResetTokens',
        enabled: true,
        run: () =>
          this.cleanupPasswordResetTokens(
            this.computeCutoff(PASSWORD_RESET_TOKEN_RETENTION_DAYS, now),
            now,
            config.batchSize
          )
      }
    ];

    for (const step of steps) {
      if (!step.enabled) {
        continue;
      }
      try {
        deleted[step.entity] = await step.run();
      } catch (error) {
        errors.push(step.entity);
        await this.systemLogsService.write({
          level: SystemLogLevel.ERROR,
          source: SYSTEM_LOG_SOURCES.DATA_RETENTION,
          message: `Data retention cleanup step failed: ${step.entity}`,
          context: { event: SYSTEM_LOG_EVENTS.DATA_RETENTION_STEP_FAILED, entity: step.entity },
          errorStack: error instanceof Error ? error.stack ?? error.message : String(error)
        });
      }
    }

    const summary: DataRetentionRunSummary = {
      deleted,
      errors,
      durationMs: Date.now() - startedAt
    };

    await this.systemLogsService.write({
      level: SystemLogLevel.INFO,
      source: SYSTEM_LOG_SOURCES.DATA_RETENTION,
      message: 'Data retention cleanup run completed',
      context: {
        event: SYSTEM_LOG_EVENTS.DATA_RETENTION_RUN_COMPLETED,
        deleted,
        errors,
        durationMs: summary.durationMs
      }
    });

    return summary;
  }

  private cleanupSystemLogs(cutoff: Date, batchSize: number): Promise<number> {
    return this.deleteInBatches(
      batchSize,
      (take) =>
        this.prisma.systemLog.findMany({
          where: { createdAt: { lt: cutoff } },
          select: { id: true },
          orderBy: { createdAt: 'asc' },
          take
        }),
      (ids) => this.prisma.systemLog.deleteMany({ where: { id: { in: ids } } })
    );
  }

  private cleanupAuditLogs(cutoff: Date, batchSize: number): Promise<number> {
    return this.deleteInBatches(
      batchSize,
      (take) =>
        this.prisma.auditLog.findMany({
          where: { createdAt: { lt: cutoff } },
          select: { id: true },
          orderBy: { createdAt: 'asc' },
          take
        }),
      (ids) => this.prisma.auditLog.deleteMany({ where: { id: { in: ids } } })
    );
  }

  // Only READ notifications are deleted; NotificationDelivery rows are removed
  // by the database via ON DELETE CASCADE on notificationId.
  private cleanupNotifications(cutoff: Date, batchSize: number): Promise<number> {
    return this.deleteInBatches(
      batchSize,
      (take) =>
        this.prisma.notification.findMany({
          where: { status: NotificationStatus.READ, createdAt: { lt: cutoff } },
          select: { id: true },
          orderBy: { createdAt: 'asc' },
          take
        }),
      (ids) => this.prisma.notification.deleteMany({ where: { id: { in: ids } } })
    );
  }

  private cleanupPasswordResetTokens(cutoff: Date, now: Date, batchSize: number): Promise<number> {
    return this.deleteInBatches(
      batchSize,
      (take) =>
        this.prisma.passwordResetToken.findMany({
          where: {
            createdAt: { lt: cutoff },
            OR: [{ usedAt: { not: null } }, { expiresAt: { lt: now } }]
          },
          select: { id: true },
          orderBy: { createdAt: 'asc' },
          take
        }),
      (ids) => this.prisma.passwordResetToken.deleteMany({ where: { id: { in: ids } } })
    );
  }

  private async deleteInBatches(
    batchSize: number,
    findIds: (take: number) => Promise<Array<{ id: string }>>,
    deleteByIds: (ids: string[]) => Promise<{ count: number }>
  ): Promise<number> {
    let totalDeleted = 0;

    for (;;) {
      const rows = await findIds(batchSize);
      if (rows.length === 0) {
        return totalDeleted;
      }

      const result = await deleteByIds(rows.map((row) => row.id));
      totalDeleted += result.count;

      await this.pause(DATA_RETENTION_BATCH_PAUSE_MS);
    }
  }

  // The pause timer is intentionally not unref'ed: it only exists while a
  // cleanup run is in progress and must keep the awaiting run alive.
  private pause(ms: number): Promise<void> {
    return new Promise((resolve) => {
      setTimeout(resolve, ms);
    });
  }

  private readNonNegativeEnv(key: string, defaultValue: number): number {
    const parsed = parseIntegerEnv(this.configService.get<string>(key), defaultValue);
    return parsed < 0 ? defaultValue : parsed;
  }
}

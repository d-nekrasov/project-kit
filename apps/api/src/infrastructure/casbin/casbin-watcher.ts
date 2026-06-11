import { Inject, Injectable, OnModuleDestroy, forwardRef } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SystemLogLevel } from '@prisma/client';
import { randomUUID } from 'node:crypto';
import { parseBooleanFlag, parseIntegerEnv } from '../../common/utils/env.util';
import { SYSTEM_LOG_EVENTS } from '../../core/system-logs/constants/system-log-events.constants';
import { SYSTEM_LOG_SOURCES } from '../../core/system-logs/constants/system-log-sources.constants';
import { SystemLogsService } from '../../core/system-logs/system-logs.service';
import { RedisService } from '../redis/redis.service';

export const CASBIN_POLICY_EVENTS_CHANNEL = 'project-kit:casbin:policy-events';

export type CasbinWatcherMode = 'redis' | 'disabled';

export type CasbinPolicyEventType =
  | 'reload_all'
  | 'reload_role'
  | 'reload_user_org'
  | 'reload_user_system';

export interface CasbinPolicyEvent {
  type: CasbinPolicyEventType;
  roleId?: string;
  userId?: string;
  organizationId?: string;
  instanceId: string;
  occurredAt: string;
}

export type CasbinPolicyEventInput = Omit<CasbinPolicyEvent, 'instanceId' | 'occurredAt'>;

export type CasbinPolicyEventHandler = (event: CasbinPolicyEvent) => Promise<void>;

export function selectCasbinWatcherMode(
  configService: ConfigService,
  redisService: Pick<RedisService, 'isRedisEnabled' | 'getRedisUrl'>
): CasbinWatcherMode {
  if (redisService.isRedisEnabled() && redisService.getRedisUrl()) {
    return 'redis';
  }

  const appEnv = (configService.get<string>('APP_ENV') ?? 'development').toLowerCase();
  const multiInstance = parseBooleanFlag(configService.get<string>('MULTI_INSTANCE'), false);
  if (appEnv === 'production' && multiInstance) {
    throw new Error(
      'Redis-backed Casbin policy watcher is required in production with MULTI_INSTANCE=true. Set REDIS_ENABLED=true and REDIS_URL.'
    );
  }

  return 'disabled';
}

@Injectable()
export class CasbinPolicyWatcher implements OnModuleDestroy {
  private readonly instanceId = randomUUID();
  private mode: CasbinWatcherMode | null = null;
  private handler: CasbinPolicyEventHandler | null = null;
  private periodicReloadTimer: NodeJS.Timeout | null = null;
  private started = false;

  constructor(
    private readonly configService: ConfigService,
    private readonly redisService: RedisService,
    @Inject(forwardRef(() => SystemLogsService))
    private readonly systemLogsService: SystemLogsService
  ) {}

  onModuleDestroy(): void {
    if (this.periodicReloadTimer) {
      clearInterval(this.periodicReloadTimer);
      this.periodicReloadTimer = null;
    }
  }

  getInstanceId(): string {
    return this.instanceId;
  }

  getMode(): CasbinWatcherMode {
    if (!this.mode) {
      this.mode = selectCasbinWatcherMode(this.configService, this.redisService);
    }
    return this.mode;
  }

  async start(handler: CasbinPolicyEventHandler): Promise<void> {
    if (this.started) {
      return;
    }
    this.started = true;
    this.handler = handler;
    this.startPeriodicReload();

    if (this.getMode() !== 'redis') {
      return;
    }

    const subscriber = await this.redisService.getSubscriberClient();
    if (!subscriber) {
      return;
    }

    await subscriber.subscribe(CASBIN_POLICY_EVENTS_CHANNEL);
    subscriber.on('message', (channel: string, message: string) => {
      if (channel !== CASBIN_POLICY_EVENTS_CHANNEL) {
        return;
      }
      void this.handleMessage(message);
    });
    // After subscribe() resolves the connection is established, so every later
    // "ready" means the subscription was re-established after a disconnect and
    // policy events may have been missed in between.
    subscriber.on('ready', () => {
      void this.runFullReload('reconnect');
    });
  }

  async publishPolicyEvent(input: CasbinPolicyEventInput): Promise<void> {
    if (this.getMode() !== 'redis') {
      return;
    }

    const event: CasbinPolicyEvent = {
      ...input,
      instanceId: this.instanceId,
      occurredAt: new Date().toISOString()
    };

    try {
      const publisher = await this.redisService.getPublisherClient();
      await publisher?.publish(CASBIN_POLICY_EVENTS_CHANNEL, JSON.stringify(event));
    } catch (error) {
      await this.systemLogsService.write({
        level: SystemLogLevel.ERROR,
        source: SYSTEM_LOG_SOURCES.CASBIN,
        message: 'Failed to publish Casbin policy event',
        context: { event: SYSTEM_LOG_EVENTS.CASBIN_WATCHER_PUBLISH_FAILED, type: input.type },
        errorStack: error instanceof Error ? error.stack ?? error.message : String(error)
      });
    }
  }

  private startPeriodicReload(): void {
    const intervalMs = parseIntegerEnv(
      this.configService.get<string>('CASBIN_POLICY_RELOAD_INTERVAL_MS'),
      0
    );
    if (intervalMs <= 0) {
      return;
    }

    this.periodicReloadTimer = setInterval(() => {
      void this.runFullReload('periodic');
    }, intervalMs);
    this.periodicReloadTimer.unref();
  }

  private async handleMessage(message: string): Promise<void> {
    try {
      const event = JSON.parse(message) as CasbinPolicyEvent;
      if (!event || typeof event !== 'object' || typeof event.type !== 'string') {
        throw new Error('Malformed Casbin policy event');
      }

      if (event.instanceId === this.instanceId) {
        return;
      }

      await this.handler?.(event);
    } catch (error) {
      await this.systemLogsService.write({
        level: SystemLogLevel.ERROR,
        source: SYSTEM_LOG_SOURCES.CASBIN,
        message: 'Failed to handle Casbin policy event',
        context: { event: SYSTEM_LOG_EVENTS.CASBIN_WATCHER_EVENT_FAILED },
        errorStack: error instanceof Error ? error.stack ?? error.message : String(error)
      });
    }
  }

  private async runFullReload(reason: 'reconnect' | 'periodic'): Promise<void> {
    try {
      await this.handler?.({
        type: 'reload_all',
        instanceId: this.instanceId,
        occurredAt: new Date().toISOString()
      });
    } catch (error) {
      await this.systemLogsService.write({
        level: SystemLogLevel.ERROR,
        source: SYSTEM_LOG_SOURCES.CASBIN,
        message: 'Failed to fully reload Casbin policies from watcher',
        context: { event: SYSTEM_LOG_EVENTS.CASBIN_WATCHER_RESYNC_FAILED, reason },
        errorStack: error instanceof Error ? error.stack ?? error.message : String(error)
      });
    }
  }
}

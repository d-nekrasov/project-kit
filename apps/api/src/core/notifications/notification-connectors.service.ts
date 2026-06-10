import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { NotificationConnector, NotificationConnectorStatus, Prisma } from '@prisma/client';
import { ConfigEncryptionService } from '../../common/security/config-encryption.service';
import { RequestMetadata } from '../../common/utils/request-metadata.util';
import { PrismaService } from '../../infrastructure/prisma/prisma.service';
import { AUDIT_ACTIONS, AUDIT_ENTITY_TYPES } from '../audit-logs/constants/audit-actions.constants';
import { AuditLogsService } from '../audit-logs/audit-logs.service';
import { CurrentUser } from '../auth/types/current-user.type';
import { CurrentOrganization } from '../organization-context/types/current-organization.type';
import { NotificationConnectorResponseDto } from './dto/notification-connector-response.dto';
import { UpdateNotificationConnectorDto } from './dto/update-notification-connector.dto';

const SENSITIVE_CONFIG_KEYS = new Set(['password', 'apiKey', 'token', 'secret']);
const MASKED_SECRET_VALUE = '********';

@Injectable()
export class NotificationConnectorsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLogsService: AuditLogsService,
    private readonly configEncryptionService: ConfigEncryptionService
  ) {}

  async findAll(currentUser: CurrentUser): Promise<NotificationConnectorResponseDto[]> {
    this.ensureSuperAdmin(currentUser);
    const connectors = await this.prisma.notificationConnector.findMany({
      orderBy: [{ channel: 'asc' }, { code: 'asc' }]
    });
    return connectors.map((connector) => this.toResponse(connector));
  }

  async update(
    code: string,
    dto: UpdateNotificationConnectorDto,
    currentUser: CurrentUser,
    currentOrganization: CurrentOrganization,
    requestMetadata?: RequestMetadata
  ): Promise<NotificationConnectorResponseDto> {
    this.ensureSuperAdmin(currentUser);
    const existing = await this.prisma.notificationConnector.findUnique({
      where: { code }
    });
    if (!existing) {
      throw new NotFoundException('Notification connector not found');
    }
    const config = dto.config ? this.mergeConfig(existing.config, dto.config) : existing.config;

    const updated = await this.prisma.notificationConnector.update({
      where: { code },
      data: {
        ...(dto.status ? { status: dto.status } : {}),
        config: config === null ? Prisma.JsonNull : (config as Prisma.InputJsonValue)
      }
    });

    await this.auditLogsService.write({
      userId: currentUser.id,
      organizationId: currentOrganization.id,
      action: AUDIT_ACTIONS.NOTIFICATION_CONNECTOR_UPDATE,
      entityType: AUDIT_ENTITY_TYPES.NOTIFICATION_CONNECTOR,
      entityId: updated.id,
      metadata: {
        code: updated.code,
        channel: updated.channel,
        status: dto.status ?? existing.status,
        changedConfigKeys: dto.config ? Object.keys(dto.config) : []
      },
      ip: requestMetadata?.ip,
      userAgent: requestMetadata?.userAgent
    });

    return this.toResponse(updated);
  }

  private ensureSuperAdmin(currentUser: CurrentUser): void {
    if (!currentUser.systemRoles.includes('super_admin')) {
      throw new ForbiddenException('Only super admin can manage notification connectors');
    }
  }

  private mergeConfig(existingConfig: Prisma.JsonValue, patch: Record<string, unknown>): Record<string, unknown> | null {
    const existing = this.asRecord(existingConfig);
    const next: Record<string, unknown> = { ...existing };

    for (const [key, value] of Object.entries(patch)) {
      if (this.isSensitiveKey(key) && (value === MASKED_SECRET_VALUE || value === '')) {
        continue;
      }
      next[key] = this.shouldEncryptValue(key, value)
        ? this.configEncryptionService.encrypt(value)
        : value;
    }

    return next;
  }

  private asRecord(value: Prisma.JsonValue): Record<string, unknown> {
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      return value as Record<string, unknown>;
    }
    return {};
  }

  private maskConfig(value: Prisma.JsonValue): Record<string, unknown> | null {
    if (!value || typeof value !== 'object' || Array.isArray(value)) {
      return null;
    }
    const config = { ...(value as Record<string, unknown>) };

    for (const key of Object.keys(config)) {
      if (
        this.isSensitiveKey(key) &&
        typeof config[key] === 'string' &&
        (config[key] as string).length > 0
      ) {
        config[key] = MASKED_SECRET_VALUE;
      }
    }

    return config;
  }

  private isSensitiveKey(key: string): boolean {
    return SENSITIVE_CONFIG_KEYS.has(key);
  }

  private shouldEncryptValue(key: string, value: unknown): value is string {
    return this.isSensitiveKey(key) && typeof value === 'string' && value.length > 0;
  }

  private toResponse(connector: NotificationConnector): NotificationConnectorResponseDto {
    return {
      id: connector.id,
      code: connector.code,
      channel: connector.channel,
      status: connector.status as NotificationConnectorStatus,
      config: this.maskConfig(connector.config),
      createdAt: connector.createdAt,
      updatedAt: connector.updatedAt
    };
  }
}

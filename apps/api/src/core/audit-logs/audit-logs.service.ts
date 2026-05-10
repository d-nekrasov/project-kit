import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, SystemLogLevel } from '@prisma/client';
import { AppLoggerService } from '../../infrastructure/logger/app-logger.service';
import { PrismaService } from '../../infrastructure/prisma/prisma.service';
import { SYSTEM_LOG_EVENTS } from '../system-logs/constants/system-log-events.constants';
import { SYSTEM_LOG_SOURCES } from '../system-logs/constants/system-log-sources.constants';
import { SystemLogsService } from '../system-logs/system-logs.service';
import { CurrentUser } from '../auth/types/current-user.type';
import { CurrentOrganization } from '../organization-context/types/current-organization.type';
import { AuditLogResponseDto } from './dto/audit-log-response.dto';
import { AuditLogsListQueryDto } from './dto/audit-logs-list-query.dto';
import { WriteAuditLogDto } from './dto/write-audit-log.dto';

const AUDIT_LOG_INCLUDE = {
  user: { select: { id: true, email: true, name: true } },
  organization: { select: { id: true, name: true, slug: true } }
} satisfies Prisma.AuditLogInclude;

@Injectable()
export class AuditLogsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly logger: AppLoggerService,
    private readonly systemLogsService: SystemLogsService
  ) {}

  async findAll(
    query: AuditLogsListQueryDto,
    currentUser: CurrentUser,
    currentOrganization: CurrentOrganization
  ): Promise<{ items: AuditLogResponseDto[]; meta: { page: number; limit: number; total: number; totalPages: number } }> {
    const page = query.page ?? 1;
    const limit = Math.min(query.limit ?? 50, 200);
    const skip = (page - 1) * limit;
    const search = query.search?.trim();
    const isSuperAdmin = currentUser.systemRoles.includes('super_admin');

    let allowedOrganizationId: string | undefined;
    if (!isSuperAdmin) {
      if (query.organizationId && query.organizationId !== currentOrganization.id) {
        throw new ForbiddenException('You do not have access to this organization');
      }
      allowedOrganizationId = currentOrganization.id;
    } else if (query.organizationId) {
      allowedOrganizationId = query.organizationId;
    }

    const where: Prisma.AuditLogWhereInput = {
      ...(allowedOrganizationId ? { organizationId: allowedOrganizationId } : {}),
      ...(query.userId ? { userId: query.userId } : {}),
      ...(query.action ? { action: query.action } : {}),
      ...(query.entityType ? { entityType: query.entityType } : {}),
      ...(query.entityId ? { entityId: query.entityId } : {}),
      ...(query.dateFrom || query.dateTo
        ? { createdAt: { ...(query.dateFrom ? { gte: new Date(query.dateFrom) } : {}), ...(query.dateTo ? { lte: new Date(query.dateTo) } : {}) } }
        : {}),
      ...(search
        ? {
            OR: [
              { action: { contains: search, mode: 'insensitive' } },
              { entityType: { contains: search, mode: 'insensitive' } },
              { entityId: { contains: search, mode: 'insensitive' } }
            ]
          }
        : {})
    };

    const [items, total] = await this.prisma.$transaction([
      this.prisma.auditLog.findMany({ where, include: AUDIT_LOG_INCLUDE, orderBy: { createdAt: 'desc' }, skip, take: limit }),
      this.prisma.auditLog.count({ where })
    ]);

    return {
      items: items.map((item) => this.toResponse(item)),
      meta: { page, limit, total, totalPages: Math.ceil(total / limit) || 1 }
    };
  }

  async findById(id: string, currentUser: CurrentUser, currentOrganization: CurrentOrganization): Promise<AuditLogResponseDto> {
    const log = await this.prisma.auditLog.findUnique({ where: { id }, include: AUDIT_LOG_INCLUDE });
    if (!log) {
      throw new NotFoundException('Audit log not found');
    }

    const isSuperAdmin = currentUser.systemRoles.includes('super_admin');
    if (!isSuperAdmin && log.organizationId !== currentOrganization.id) {
      throw new NotFoundException('Audit log not found');
    }

    return this.toResponse(log);
  }

  async write(dto: WriteAuditLogDto): Promise<void> {
    try {
      const metadata =
        dto.metadata === undefined
          ? undefined
          : dto.metadata === null
            ? Prisma.JsonNull
            : (dto.metadata as Prisma.InputJsonValue);
      await this.prisma.auditLog.create({
        data: {
          userId: dto.userId ?? null,
          organizationId: dto.organizationId ?? null,
          action: dto.action,
          entityType: dto.entityType,
          entityId: dto.entityId ?? null,
          metadata,
          ip: dto.ip ?? null,
          userAgent: dto.userAgent ?? null
        }
      });
    } catch (error) {
      const message = error instanceof Error ? error.stack ?? error.message : String(error);
      this.logger.error('Failed to write audit log', message);
      await this.systemLogsService.write({
        level: SystemLogLevel.ERROR,
        source: SYSTEM_LOG_SOURCES.AUDIT_LOGS,
        message: 'Failed to write audit log',
        context: {
          event: SYSTEM_LOG_EVENTS.AUDIT_WRITE_FAILED,
          action: dto.action,
          entityType: dto.entityType,
          entityId: dto.entityId
        },
        errorStack: error instanceof Error ? error.stack ?? error.message : String(error),
        userId: dto.userId ?? null,
        organizationId: dto.organizationId ?? null
      });
    }
  }

  private toResponse(item: Prisma.AuditLogGetPayload<{ include: typeof AUDIT_LOG_INCLUDE }>): AuditLogResponseDto {
    return {
      id: item.id,
      userId: item.userId,
      organizationId: item.organizationId,
      action: item.action,
      entityType: item.entityType,
      entityId: item.entityId,
      metadata: (item.metadata as Record<string, unknown> | null) ?? null,
      ip: item.ip,
      userAgent: item.userAgent,
      createdAt: item.createdAt,
      user: item.user,
      organization: item.organization
    };
  }
}

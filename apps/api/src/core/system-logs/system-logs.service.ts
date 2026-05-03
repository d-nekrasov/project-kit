import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../infrastructure/prisma/prisma.service';
import { CurrentUser } from '../auth/types/current-user.type';
import { CurrentOrganization } from '../organization-context/types/current-organization.type';
import { SystemLogResponseDto } from './dto/system-log-response.dto';
import { SystemLogsListQueryDto } from './dto/system-logs-list-query.dto';
import { WriteSystemLogDto } from './dto/write-system-log.dto';

const SYSTEM_LOG_INCLUDE = {
  user: { select: { id: true, email: true, name: true } },
  organization: { select: { id: true, name: true, slug: true } }
} satisfies Prisma.SystemLogInclude;

@Injectable()
export class SystemLogsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(
    query: SystemLogsListQueryDto,
    currentUser: CurrentUser,
    currentOrganization: CurrentOrganization
  ): Promise<{ items: SystemLogResponseDto[]; meta: { page: number; limit: number; total: number; totalPages: number } }> {
    const page = query.page ?? 1;
    const limit = Math.min(query.limit ?? 50, 200);
    const skip = (page - 1) * limit;
    const search = query.search?.trim();
    const isSuperAdmin = currentUser.systemRoles.includes('super_admin');

    if (!isSuperAdmin && query.organizationId && query.organizationId !== currentOrganization.id) {
      throw new ForbiddenException('You do not have access to this organization');
    }

    const where: Prisma.SystemLogWhereInput = {
      ...(isSuperAdmin
        ? query.organizationId
          ? { organizationId: query.organizationId }
          : {}
        : { organizationId: currentOrganization.id }),
      ...(query.level ? { level: query.level } : {}),
      ...(query.source ? { source: query.source } : {}),
      ...(query.userId ? { userId: query.userId } : {}),
      ...(query.dateFrom || query.dateTo
        ? { createdAt: { ...(query.dateFrom ? { gte: new Date(query.dateFrom) } : {}), ...(query.dateTo ? { lte: new Date(query.dateTo) } : {}) } }
        : {}),
      ...(search
        ? {
            OR: [
              { source: { contains: search, mode: 'insensitive' } },
              { message: { contains: search, mode: 'insensitive' } }
            ]
          }
        : {})
    };

    const [items, total] = await this.prisma.$transaction([
      this.prisma.systemLog.findMany({ where, include: SYSTEM_LOG_INCLUDE, orderBy: { createdAt: 'desc' }, skip, take: limit }),
      this.prisma.systemLog.count({ where })
    ]);

    return {
      items: items.map((item) => this.toResponse(item)),
      meta: { page, limit, total, totalPages: Math.ceil(total / limit) || 1 }
    };
  }

  async findById(id: string, currentUser: CurrentUser, currentOrganization: CurrentOrganization): Promise<SystemLogResponseDto> {
    const log = await this.prisma.systemLog.findUnique({ where: { id }, include: SYSTEM_LOG_INCLUDE });
    if (!log) {
      throw new NotFoundException('System log not found');
    }

    const isSuperAdmin = currentUser.systemRoles.includes('super_admin');
    if (!isSuperAdmin && log.organizationId !== currentOrganization.id) {
      throw new NotFoundException('System log not found');
    }

    return this.toResponse(log);
  }

  async write(dto: WriteSystemLogDto): Promise<void> {
    try {
      const context =
        dto.context === undefined
          ? undefined
          : dto.context === null
            ? Prisma.JsonNull
            : (dto.context as Prisma.InputJsonValue);
      await this.prisma.systemLog.create({
        data: {
          level: dto.level,
          source: dto.source,
          message: dto.message,
          context,
          errorStack: dto.errorStack ?? null,
          userId: dto.userId ?? null,
          organizationId: dto.organizationId ?? null
        }
      });
    } catch (error) {
      console.error('Failed to write system log', error);
    }
  }

  private toResponse(item: Prisma.SystemLogGetPayload<{ include: typeof SYSTEM_LOG_INCLUDE }>): SystemLogResponseDto {
    return {
      id: item.id,
      level: item.level,
      source: item.source,
      message: item.message,
      context: (item.context as Record<string, unknown> | null) ?? null,
      errorStack: item.errorStack,
      userId: item.userId,
      organizationId: item.organizationId,
      createdAt: item.createdAt,
      user: item.user,
      organization: item.organization
    };
  }
}

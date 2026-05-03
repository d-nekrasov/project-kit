import { BadRequestException, ForbiddenException, Injectable, NotFoundException, OnModuleInit } from '@nestjs/common';
import { ModuleRegistry, ModuleStatus, Prisma, SystemLogLevel } from '@prisma/client';
import { RequestMetadata } from '../../common/utils/request-metadata.util';
import { PrismaService } from '../../infrastructure/prisma/prisma.service';
import { AUDIT_ACTIONS, AUDIT_ENTITY_TYPES } from '../audit-logs/constants/audit-actions.constants';
import { AuditLogsService } from '../audit-logs/audit-logs.service';
import { CurrentUser } from '../auth/types/current-user.type';
import { CurrentOrganization } from '../organization-context/types/current-organization.type';
import { SYSTEM_LOG_SOURCES } from '../system-logs/constants/system-log-sources.constants';
import { SystemLogsService } from '../system-logs/system-logs.service';
import { CORE_MODULE_MANIFESTS } from './constants/core-module-manifests.constants';
import { ModuleRegistryListQueryDto } from './dto/module-registry-list-query.dto';
import { ModuleRegistryResponseDto } from './dto/module-registry-response.dto';
import { AppModuleManifest } from './types/module-manifest.type';

@Injectable()
export class ModuleRegistryService implements OnModuleInit {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLogsService: AuditLogsService,
    private readonly systemLogsService: SystemLogsService
  ) {}

  async onModuleInit(): Promise<void> {
    await this.registerModules(CORE_MODULE_MANIFESTS);
  }

  async findAll(query: ModuleRegistryListQueryDto): Promise<{
    items: ModuleRegistryResponseDto[];
    meta: { page: number; limit: number; total: number; totalPages: number };
  }> {
    const page = query.page ?? 1;
    const limit = Math.min(query.limit ?? 50, 200);
    const skip = (page - 1) * limit;
    const search = query.search?.trim();

    const where: Prisma.ModuleRegistryWhereInput = {
      ...(query.status ? { status: query.status } : {}),
      ...(search
        ? {
            OR: [
              { name: { contains: search, mode: 'insensitive' } },
              { title: { contains: search, mode: 'insensitive' } },
              { description: { contains: search, mode: 'insensitive' } }
            ]
          }
        : {})
    };

    const [items, total] = await this.prisma.$transaction([
      this.prisma.moduleRegistry.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit
      }),
      this.prisma.moduleRegistry.count({ where })
    ]);

    return {
      items: items.map((item) => this.toResponse(item)),
      meta: { page, limit, total, totalPages: Math.ceil(total / limit) || 1 }
    };
  }

  async findByName(name: string): Promise<ModuleRegistryResponseDto> {
    const module = await this.prisma.moduleRegistry.findUnique({ where: { name } });
    if (!module) {
      throw new NotFoundException('Module not found');
    }
    return this.toResponse(module);
  }

  async updateStatus(
    currentUser: CurrentUser,
    currentOrganization: CurrentOrganization,
    name: string,
    status: ModuleStatus,
    requestMetadata?: RequestMetadata
  ): Promise<ModuleRegistryResponseDto> {
    if (!currentUser.systemRoles.includes('super_admin')) {
      throw new ForbiddenException('Only super admin can update module status');
    }

    const module = await this.prisma.moduleRegistry.findUnique({ where: { name } });
    if (!module) {
      throw new NotFoundException('Module not found');
    }
    if (module.name === 'core' && status === ModuleStatus.DISABLED) {
      throw new BadRequestException('Core module cannot be disabled');
    }
    if (module.status === status) {
      return this.toResponse(module);
    }

    const updated = await this.prisma.moduleRegistry.update({
      where: { id: module.id },
      data: { status }
    });
    await this.auditLogsService.write({
      userId: currentUser.id,
      organizationId: currentOrganization.id,
      action: AUDIT_ACTIONS.MODULE_STATUS_UPDATE,
      entityType: AUDIT_ENTITY_TYPES.MODULE,
      entityId: updated.id,
      metadata: { name: updated.name, status },
      ip: requestMetadata?.ip,
      userAgent: requestMetadata?.userAgent
    });

    return this.toResponse(updated);
  }

  async registerModules(manifests: AppModuleManifest[]): Promise<void> {
    try {
      for (const manifest of manifests) {
        if (!manifest.name || !manifest.title || !manifest.version) {
          throw new BadRequestException('Module manifest must include name, title and version');
        }

        const existing = await this.prisma.moduleRegistry.findUnique({
          where: { name: manifest.name },
          select: { id: true }
        });
        const manifestJson = manifest as unknown as Prisma.InputJsonValue;

        if (!existing) {
          await this.prisma.moduleRegistry.create({
            data: {
              name: manifest.name,
              title: manifest.title,
              version: manifest.version,
              description: manifest.description ?? null,
              status: ModuleStatus.ENABLED,
              manifest: manifestJson,
              installedAt: new Date()
            }
          });
        } else {
          await this.prisma.moduleRegistry.update({
            where: { id: existing.id },
            data: {
              title: manifest.title,
              version: manifest.version,
              description: manifest.description ?? null,
              manifest: manifestJson
            }
          });
        }

        for (const permissionCode of manifest.permissions ?? []) {
          await this.prisma.permission.upsert({
            where: { code: permissionCode },
            create: {
              code: permissionCode,
              module: manifest.name,
              description: `${manifest.title} permission: ${permissionCode}`
            },
            update: {
              module: manifest.name,
              description: `${manifest.title} permission: ${permissionCode}`
            }
          });
        }
      }
      // TODO: consider casbin reload if role-permission assignments are auto-managed here.
    } catch (error) {
      await this.systemLogsService.write({
        level: SystemLogLevel.ERROR,
        source: SYSTEM_LOG_SOURCES.MODULE_REGISTRY,
        message: 'Failed to register modules',
        context: { names: manifests.map((item) => item.name) },
        errorStack: error instanceof Error ? error.stack ?? error.message : String(error)
      });
      throw error;
    }
  }

  private toResponse(item: ModuleRegistry): ModuleRegistryResponseDto {
    return {
      id: item.id,
      name: item.name,
      title: item.title,
      version: item.version,
      description: item.description,
      status: item.status,
      manifest: (item.manifest as Record<string, unknown> | null) ?? null,
      installedAt: item.installedAt,
      createdAt: item.createdAt,
      updatedAt: item.updatedAt
    };
  }
}

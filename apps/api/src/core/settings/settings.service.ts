import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException
} from '@nestjs/common';
import { Prisma, SettingScope } from '@prisma/client';
import { CurrentUser } from '../auth/types/current-user.type';
import { CurrentOrganization } from '../organization-context/types/current-organization.type';
import { PrismaService } from '../../infrastructure/prisma/prisma.service';
import { RequestMetadata } from '../../common/utils/request-metadata.util';
import { AuditLogsService } from '../audit-logs/audit-logs.service';
import { AUDIT_ACTIONS, AUDIT_ENTITY_TYPES } from '../audit-logs/constants/audit-actions.constants';
import { GetSettingQueryDto } from './dto/get-setting-query.dto';
import { SettingResponseDto } from './dto/setting-response.dto';
import { SettingsListQueryDto } from './dto/settings-list-query.dto';
import { UpsertSettingDto } from './dto/upsert-setting.dto';

type SettingTarget = {
  key: string;
  scope: SettingScope;
  organizationId: string | null;
  moduleCode: string | null;
};

@Injectable()
export class SettingsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLogsService: AuditLogsService
  ) {}

  async findAll(
    query: SettingsListQueryDto,
    user: CurrentUser,
    organization: CurrentOrganization
  ): Promise<{
    items: SettingResponseDto[];
    meta: { page: number; limit: number; total: number; totalPages: number };
  }> {
    const page = query.page ?? 1;
    const limit = Math.min(query.limit ?? 50, 200);
    const skip = (page - 1) * limit;
    const search = query.search?.trim();
    const moduleCode = query.module?.trim().toLowerCase();

    const where = this.buildListWhere(query.scope, organization.id, search, moduleCode);
    const [items, total] = await this.prisma.$transaction([
      this.prisma.setting.findMany({
        where,
        skip,
        take: limit,
        orderBy: [{ scope: 'asc' }, { key: 'asc' }, { createdAt: 'desc' }]
      }),
      this.prisma.setting.count({ where })
    ]);

    return {
      items: items.map((item) => this.toSettingResponse(item)),
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit) || 1
      }
    };
  }

  async findByKey(
    keyParam: string,
    query: GetSettingQueryDto,
    organization: CurrentOrganization
  ): Promise<SettingResponseDto> {
    const key = this.normalizeKey(keyParam);

    if (query.scope === SettingScope.GLOBAL) {
      const setting = await this.prisma.setting.findFirst({
        where: { key, scope: SettingScope.GLOBAL, organizationId: null, moduleCode: null }
      });
      if (!setting) {
        throw new NotFoundException('Setting not found');
      }
      return this.toSettingResponse(setting);
    }

    if (query.scope === SettingScope.ORGANIZATION) {
      const setting = await this.prisma.setting.findFirst({
        where: { key, scope: SettingScope.ORGANIZATION, organizationId: organization.id, moduleCode: null }
      });
      if (!setting) {
        throw new NotFoundException('Setting not found');
      }
      return this.toSettingResponse(setting);
    }

    const moduleCode = this.normalizeModule(query.module);
    const orgScoped = await this.prisma.setting.findFirst({
      where: { key, scope: SettingScope.MODULE, organizationId: organization.id, moduleCode }
    });
    if (orgScoped) {
      return this.toSettingResponse(orgScoped);
    }

    const globalScoped = await this.prisma.setting.findFirst({
      where: { key, scope: SettingScope.MODULE, organizationId: null, moduleCode }
    });
    if (!globalScoped) {
      throw new NotFoundException('Setting not found');
    }

    return this.toSettingResponse(globalScoped);
  }

  async upsert(
    keyParam: string,
    dto: UpsertSettingDto,
    user: CurrentUser,
    organization: CurrentOrganization,
    requestMetadata?: RequestMetadata
  ): Promise<SettingResponseDto> {
    const target = this.resolveSettingTarget(keyParam, dto, user, organization);

    const setting = await this.prisma.$transaction(async (tx) => {
      const existing = await tx.setting.findMany({ where: target, orderBy: { createdAt: 'asc' } });
      if (existing.length > 1) {
        throw new ConflictException('Duplicate settings detected for the same target');
      }
      if (existing.length === 1) {
        return tx.setting.update({
          where: { id: existing[0].id },
          data: { value: dto.value as Prisma.InputJsonValue }
        });
      }

      return tx.setting.create({
        data: {
          ...target,
          value: dto.value as Prisma.InputJsonValue
        }
      });
    });

    const response = this.toSettingResponse(setting);
    await this.auditLogsService.write({
      action: AUDIT_ACTIONS.SETTING_UPDATE,
      entityType: AUDIT_ENTITY_TYPES.SETTING,
      entityId: response.id,
      userId: user.id,
      organizationId: response.scope === SettingScope.GLOBAL ? null : response.organizationId,
      metadata: {
        key: response.key,
        scope: response.scope,
        moduleCode: response.module,
        organizationSpecific: response.scope !== SettingScope.GLOBAL && !!response.organizationId,
        valueChanged: true
      },
      ip: requestMetadata?.ip,
      userAgent: requestMetadata?.userAgent
    });

    return response;
  }

  private resolveSettingTarget(
    keyParam: string,
    dto: UpsertSettingDto,
    user: CurrentUser,
    organization: CurrentOrganization
  ): SettingTarget {
    const key = this.normalizeKey(keyParam);

    if (dto.scope === SettingScope.GLOBAL) {
      if (!this.isSuperAdmin(user)) {
        throw new ForbiddenException('Only super_admin can update GLOBAL settings');
      }
      return { key, scope: SettingScope.GLOBAL, organizationId: null, moduleCode: null };
    }

    if (dto.scope === SettingScope.ORGANIZATION) {
      return { key, scope: SettingScope.ORGANIZATION, organizationId: organization.id, moduleCode: null };
    }

    const moduleCode = this.normalizeModule(dto.module);
    const organizationSpecific = dto.organizationSpecific === true;
    if (!organizationSpecific && !this.isSuperAdmin(user)) {
      throw new ForbiddenException('Only super_admin can update global MODULE settings');
    }

    return {
      key,
      scope: SettingScope.MODULE,
      organizationId: organizationSpecific ? organization.id : null,
      moduleCode
    };
  }

  private buildListWhere(
    scope: SettingScope | undefined,
    organizationId: string,
    search: string | undefined,
    moduleCode: string | undefined
  ): Prisma.SettingWhereInput {
    const scopedWhere = (() => {
      if (scope === SettingScope.GLOBAL) {
        return { scope: SettingScope.GLOBAL, organizationId: null, moduleCode: null };
      }
      if (scope === SettingScope.ORGANIZATION) {
        return { scope: SettingScope.ORGANIZATION, organizationId, moduleCode: null };
      }
      if (scope === SettingScope.MODULE) {
        return {
          scope: SettingScope.MODULE,
          OR: [{ organizationId: null }, { organizationId }]
        };
      }
      return {
        OR: [
          { scope: SettingScope.GLOBAL, organizationId: null, moduleCode: null },
          { scope: SettingScope.ORGANIZATION, organizationId, moduleCode: null },
          { scope: SettingScope.MODULE, organizationId: null },
          { scope: SettingScope.MODULE, organizationId }
        ]
      };
    })();

    const andConditions: Prisma.SettingWhereInput[] = [scopedWhere];
    if (moduleCode) {
      andConditions.push({ moduleCode });
    }
    if (search) {
      andConditions.push({
        OR: [
          { key: { contains: search, mode: Prisma.QueryMode.insensitive } },
          { moduleCode: { contains: search, mode: Prisma.QueryMode.insensitive } }
        ]
      });
    }

    return { AND: andConditions };
  }

  private normalizeKey(key: string): string {
    const value = key.trim();
    if (!value) {
      throw new BadRequestException('Setting key is required');
    }
    return value;
  }

  private normalizeModule(moduleValue?: string): string {
    const value = moduleValue?.trim().toLowerCase();
    if (!value) {
      throw new BadRequestException('module is required for MODULE scope');
    }
    return value;
  }

  private isSuperAdmin(user: CurrentUser): boolean {
    return user.systemRoles.includes('super_admin');
  }

  private toSettingResponse(setting: {
    id: string;
    key: string;
    value: unknown;
    scope: SettingScope;
    organizationId: string | null;
    moduleCode: string | null;
    createdAt: Date;
    updatedAt: Date;
  }): SettingResponseDto {
    return {
      id: setting.id,
      key: setting.key,
      value: setting.value,
      scope: setting.scope,
      organizationId: setting.organizationId,
      module: setting.moduleCode,
      createdAt: setting.createdAt,
      updatedAt: setting.updatedAt
    };
  }
}

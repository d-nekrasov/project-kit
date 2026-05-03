import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../infrastructure/prisma/prisma.service';
import { PermissionModuleResponseDto } from './dto/permission-module-response.dto';
import { PermissionResponseDto } from './dto/permission-response.dto';
import { PermissionsListQueryDto } from './dto/permissions-list-query.dto';
import { parsePermissionCode } from './utils/parse-permission-code';

@Injectable()
export class PermissionsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(query: PermissionsListQueryDto): Promise<{
    items: PermissionResponseDto[];
    meta: { page: number; limit: number; total: number; totalPages: number };
  }> {
    const page = query.page ?? 1;
    const limit = Math.min(query.limit ?? 50, 200);
    const skip = (page - 1) * limit;
    const where = this.buildWhere(query.search, query.module);

    const [items, total] = await this.prisma.$transaction([
      this.prisma.permission.findMany({
        where,
        skip,
        take: limit,
        orderBy: [{ module: 'asc' }, { code: 'asc' }]
      }),
      this.prisma.permission.count({ where })
    ]);

    return {
      items: items.map((permission) => this.toPermissionResponse(permission)),
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit) || 1
      }
    };
  }

  async findGrouped(
    query: Pick<PermissionsListQueryDto, 'search' | 'module'>
  ): Promise<{ groups: Array<{ module: string; permissions: PermissionResponseDto[] }> }> {
    const where = this.buildWhere(query.search, query.module);
    const items = await this.prisma.permission.findMany({
      where,
      orderBy: [{ module: 'asc' }, { code: 'asc' }]
    });

    const groups = new Map<string, PermissionResponseDto[]>();
    for (const item of items) {
      const modulePermissions = groups.get(item.module) ?? [];
      modulePermissions.push(this.toPermissionResponse(item));
      groups.set(item.module, modulePermissions);
    }

    return {
      groups: Array.from(groups.entries()).map(([module, permissions]) => ({ module, permissions }))
    };
  }

  async findModules(): Promise<{ items: PermissionModuleResponseDto[] }> {
    const grouped = await this.prisma.permission.groupBy({
      by: ['module'],
      _count: { _all: true },
      orderBy: { module: 'asc' }
    });

    return {
      items: grouped.map((item) => ({
        module: item.module,
        permissionsCount: item._count._all
      }))
    };
  }

  private buildWhere(search?: string, module?: string): Prisma.PermissionWhereInput {
    const normalizedSearch = search?.trim();
    const normalizedModule = module?.trim();

    return {
      ...(normalizedModule ? { module: normalizedModule } : {}),
      ...(normalizedSearch
        ? {
            OR: [
              { code: { contains: normalizedSearch, mode: 'insensitive' } },
              { description: { contains: normalizedSearch, mode: 'insensitive' } },
              { module: { contains: normalizedSearch, mode: 'insensitive' } }
            ]
          }
        : {})
    };
  }

  private toPermissionResponse(permission: {
    id: string;
    code: string;
    module: string;
    description: string | null;
    createdAt: Date;
    updatedAt: Date;
  }): PermissionResponseDto {
    let resource: string | null = null;
    let action: string | null = null;

    try {
      const parsed = parsePermissionCode(permission.code);
      resource = parsed.resource;
      action = parsed.action;
    } catch {
      resource = null;
      action = null;
    }

    return {
      id: permission.id,
      code: permission.code,
      module: permission.module,
      description: permission.description,
      resource,
      action,
      createdAt: permission.createdAt,
      updatedAt: permission.updatedAt
    };
  }
}

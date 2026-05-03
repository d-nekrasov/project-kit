import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException
} from '@nestjs/common';
import { Prisma, RoleType } from '@prisma/client';
import { CasbinService } from '../../infrastructure/casbin/casbin.service';
import { PrismaService } from '../../infrastructure/prisma/prisma.service';
import { RequestMetadata } from '../../common/utils/request-metadata.util';
import { CurrentUser } from '../auth/types/current-user.type';
import { AuditLogsService } from '../audit-logs/audit-logs.service';
import { AUDIT_ACTIONS, AUDIT_ENTITY_TYPES } from '../audit-logs/constants/audit-actions.constants';
import { CreateRoleDto } from './dto/create-role.dto';
import { RoleResponseDto } from './dto/role-response.dto';
import { RolesListQueryDto } from './dto/roles-list-query.dto';
import { UpdateRolePermissionsDto } from './dto/update-role-permissions.dto';
import { UpdateRoleDto } from './dto/update-role.dto';

const ROLE_INCLUDE = {
  permissions: {
    include: {
      permission: true
    }
  },
  _count: {
    select: {
      userOrganizations: true,
      userSystemRoles: true
    }
  }
} satisfies Prisma.RoleInclude;

const RESERVED_SYSTEM_CODES = new Set(['super_admin', 'system_admin']);
const PROTECTED_ORG_PERMISSION_CODES = new Set(['organization_admin']);
const PROTECTED_ORG_EDIT_CODES = new Set(['organization_admin']);

@Injectable()
export class RolesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly casbinService: CasbinService,
    private readonly auditLogsService: AuditLogsService
  ) {}

  async findAll(
    organizationId: string,
    query: RolesListQueryDto
  ): Promise<{
    items: RoleResponseDto[];
    meta: { page: number; limit: number; total: number; totalPages: number };
  }> {
    const page = query.page ?? 1;
    const limit = Math.min(query.limit ?? 20, 100);
    const skip = (page - 1) * limit;
    const search = query.search?.trim();

    const where: Prisma.RoleWhereInput = {
      OR: query.includeSystem
        ? [{ type: RoleType.SYSTEM }, { type: RoleType.ORGANIZATION, organizationId }]
        : [{ type: RoleType.ORGANIZATION, organizationId }],
      ...(search
        ? {
            AND: [
              {
                OR: [
                  { name: { contains: search, mode: 'insensitive' } },
                  { code: { contains: search, mode: 'insensitive' } }
                ]
              }
            ]
          }
        : {})
    };

    const [items, total] = await this.prisma.$transaction([
      this.prisma.role.findMany({
        where,
        include: ROLE_INCLUDE,
        skip,
        take: limit,
        orderBy: [{ type: 'asc' }, { createdAt: 'desc' }]
      }),
      this.prisma.role.count({ where })
    ]);

    return {
      items: items.map((role) => this.toRoleResponse(role)),
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit) || 1
      }
    };
  }

  async findById(roleId: string, organizationId: string): Promise<RoleResponseDto> {
    const role = await this.prisma.role.findUnique({
      where: { id: roleId },
      include: ROLE_INCLUDE
    });

    if (!role || (role.type === RoleType.ORGANIZATION && role.organizationId !== organizationId)) {
      throw new NotFoundException('Role not found');
    }

    return this.toRoleResponse(role);
  }

  async create(
    organizationId: string,
    currentUser: CurrentUser,
    dto: CreateRoleDto,
    requestMetadata?: RequestMetadata
  ): Promise<RoleResponseDto> {
    const code = dto.code.trim().toLowerCase();

    if (RESERVED_SYSTEM_CODES.has(code)) {
      throw new BadRequestException('This role code is reserved');
    }

    const permissionCodes = dto.permissions ?? [];
    const permissions = await this.findPermissionsOrThrow(permissionCodes);

    const existingRole = await this.prisma.role.findUnique({
      where: {
        organizationId_code: {
          organizationId,
          code
        }
      },
      select: { id: true }
    });

    if (existingRole) {
      throw new ConflictException('Role code already exists in this organization');
    }

    const role = await this.prisma.$transaction(async (tx) => {
      const created = await tx.role.create({
        data: {
          code,
          name: dto.name,
          type: RoleType.ORGANIZATION,
          organizationId,
          ...(permissions.length
            ? {
                permissions: {
                  createMany: {
                    data: permissions.map((permission) => ({ permissionId: permission.id }))
                  }
                }
              }
            : {})
        },
        include: ROLE_INCLUDE
      });

      return created;
    });

    await this.casbinService.reloadRolePolicies(role.id);
    await this.auditLogsService.write({
      action: AUDIT_ACTIONS.ROLE_CREATE,
      entityType: AUDIT_ENTITY_TYPES.ROLE,
      entityId: role.id,
      userId: currentUser.id,
      organizationId,
      metadata: { code: role.code, name: role.name, permissions: permissionCodes },
      ip: requestMetadata?.ip,
      userAgent: requestMetadata?.userAgent
    });
    return this.toRoleResponse(role);
  }

  async update(
    roleId: string,
    currentUser: CurrentUser,
    organizationId: string,
    dto: UpdateRoleDto,
    requestMetadata?: RequestMetadata
  ): Promise<RoleResponseDto> {
    const role = await this.prisma.role.findUnique({ where: { id: roleId } });

    if (!role) {
      throw new NotFoundException('Role not found');
    }
    if (role.type === RoleType.SYSTEM) {
      throw new ForbiddenException('System role cannot be edited');
    }
    if (role.organizationId !== organizationId) {
      throw new NotFoundException('Role not found');
    }
    if (PROTECTED_ORG_EDIT_CODES.has(role.code)) {
      throw new ForbiddenException('This role cannot be edited');
    }

    const updated = await this.prisma.role.update({
      where: { id: roleId },
      data: {
        ...(dto.name !== undefined ? { name: dto.name } : {})
      },
      include: ROLE_INCLUDE
    });
    const changedFields = [dto.name !== undefined ? 'name' : null].filter(Boolean);
    await this.auditLogsService.write({
      action: AUDIT_ACTIONS.ROLE_UPDATE,
      entityType: AUDIT_ENTITY_TYPES.ROLE,
      entityId: updated.id,
      userId: currentUser.id,
      organizationId,
      metadata: { changedFields },
      ip: requestMetadata?.ip,
      userAgent: requestMetadata?.userAgent
    });

    return this.toRoleResponse(updated);
  }

  async updatePermissions(
    roleId: string,
    currentUser: CurrentUser,
    organizationId: string,
    dto: UpdateRolePermissionsDto,
    requestMetadata?: RequestMetadata
  ): Promise<RoleResponseDto> {
    const role = await this.prisma.role.findUnique({ where: { id: roleId } });

    if (!role) {
      throw new NotFoundException('Role not found');
    }
    if (role.type === RoleType.SYSTEM) {
      throw new ForbiddenException('System role permissions cannot be edited');
    }
    if (role.organizationId !== organizationId) {
      throw new NotFoundException('Role not found');
    }
    if (PROTECTED_ORG_PERMISSION_CODES.has(role.code)) {
      throw new ForbiddenException('Permissions for this role cannot be edited');
    }

    const permissions = await this.findPermissionsOrThrow(dto.permissions);

    const updated = await this.prisma.$transaction(async (tx) => {
      await tx.rolePermission.deleteMany({ where: { roleId } });

      if (permissions.length > 0) {
        await tx.rolePermission.createMany({
          data: permissions.map((permission) => ({ roleId, permissionId: permission.id }))
        });
      }

      return tx.role.findUniqueOrThrow({
        where: { id: roleId },
        include: ROLE_INCLUDE
      });
    });

    await this.casbinService.reloadRolePolicies(role.id);
    await this.auditLogsService.write({
      action: AUDIT_ACTIONS.ROLE_PERMISSIONS_UPDATE,
      entityType: AUDIT_ENTITY_TYPES.ROLE,
      entityId: updated.id,
      userId: currentUser.id,
      organizationId,
      metadata: { permissions: dto.permissions },
      ip: requestMetadata?.ip,
      userAgent: requestMetadata?.userAgent
    });
    return this.toRoleResponse(updated);
  }

  private async findPermissionsOrThrow(codes: string[]): Promise<{ id: string; code: string }[]> {
    if (codes.length === 0) {
      return [];
    }

    const uniqueCodes = [...new Set(codes)];
    const permissions = await this.prisma.permission.findMany({
      where: { code: { in: uniqueCodes } },
      select: { id: true, code: true }
    });

    if (permissions.length !== uniqueCodes.length) {
      const found = new Set(permissions.map((permission) => permission.code));
      const missing = uniqueCodes.filter((code) => !found.has(code));
      throw new BadRequestException(`Unknown permissions: ${missing.join(', ')}`);
    }

    return permissions;
  }

  private toRoleResponse(role: Prisma.RoleGetPayload<{ include: typeof ROLE_INCLUDE }>): RoleResponseDto {
    return {
      id: role.id,
      code: role.code,
      name: role.name,
      type: role.type,
      organizationId: role.organizationId,
      permissions: role.permissions.map((rolePermission) => ({
        id: rolePermission.permission.id,
        code: rolePermission.permission.code,
        module: rolePermission.permission.module,
        description: rolePermission.permission.description
      })),
      usersCount:
        role.type === RoleType.SYSTEM ? role._count.userSystemRoles : role._count.userOrganizations,
      createdAt: role.createdAt,
      updatedAt: role.updatedAt
    };
  }
}

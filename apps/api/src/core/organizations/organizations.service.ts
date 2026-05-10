import {
  ConflictException,
  ForbiddenException,
  Injectable,
  InternalServerErrorException,
  NotFoundException
} from '@nestjs/common';
import { OrganizationStatus, Prisma, RoleType } from '@prisma/client';
import { CasbinService } from '../../infrastructure/casbin/casbin.service';
import { PrismaService } from '../../infrastructure/prisma/prisma.service';
import { RequestMetadata } from '../../common/utils/request-metadata.util';
import { CurrentUser } from '../auth/types/current-user.type';
import { AuditLogsService } from '../audit-logs/audit-logs.service';
import { AUDIT_ACTIONS, AUDIT_ENTITY_TYPES } from '../audit-logs/constants/audit-actions.constants';
import { CurrentOrganization } from '../organization-context/types/current-organization.type';
import { CreateOrganizationDto } from './dto/create-organization.dto';
import { OrganizationResponseDto } from './dto/organization-response.dto';
import { OrganizationsListQueryDto } from './dto/organizations-list-query.dto';
import { UpdateOrganizationDto } from './dto/update-organization.dto';

const ORG_ADMIN_PERMISSION_CODES = [
  'users.read',
  'users.create',
  'users.update',
  'roles.read',
  'settings.read',
  'settings.update',
  'auditLogs.read',
  'modules.read'
] as const;

const ORGANIZATION_INCLUDE = {
  _count: {
    select: {
      users: true,
      roles: true
    }
  }
} satisfies Prisma.OrganizationInclude;

@Injectable()
export class OrganizationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly casbinService: CasbinService,
    private readonly auditLogsService: AuditLogsService
  ) {}

  async findAll(
    currentUser: CurrentUser,
    query: OrganizationsListQueryDto
  ): Promise<{
    items: OrganizationResponseDto[];
    meta: { page: number; limit: number; total: number; totalPages: number };
  }> {
    const page = query.page ?? 1;
    const limit = Math.min(query.limit ?? 20, 100);
    const skip = (page - 1) * limit;
    const search = query.search?.trim();

    const where: Prisma.OrganizationWhereInput = {
      ...(query.status ? { status: query.status } : {}),
      ...(search
        ? {
            OR: [
              { name: { contains: search, mode: 'insensitive' } },
              { slug: { contains: search, mode: 'insensitive' } }
            ]
          }
        : {}),
      ...(!this.isSuperAdmin(currentUser)
        ? {
            users: {
              some: {
                userId: currentUser.id
              }
            }
          }
        : {})
    };

    const [items, total] = await this.prisma.$transaction([
      this.prisma.organization.findMany({
        where,
        include: ORGANIZATION_INCLUDE,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' }
      }),
      this.prisma.organization.count({ where })
    ]);

    return {
      items: items.map((organization) => this.toOrganizationResponse(organization)),
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit) || 1
      }
    };
  }

  async findById(currentUser: CurrentUser, organizationId: string): Promise<OrganizationResponseDto> {
    const organization = await this.prisma.organization.findFirst({
      where: this.isSuperAdmin(currentUser)
        ? { id: organizationId }
        : {
            id: organizationId,
            users: {
              some: {
                userId: currentUser.id
              }
            }
          },
      include: ORGANIZATION_INCLUDE
    });

    if (!organization) {
      throw new NotFoundException('Organization not found');
    }

    return this.toOrganizationResponse(organization);
  }

  async create(
    currentUser: CurrentUser,
    dto: CreateOrganizationDto,
    requestMetadata?: RequestMetadata
  ): Promise<OrganizationResponseDto> {
    if (!this.isSuperAdmin(currentUser)) {
      throw new ForbiddenException('Only super admin can create organizations');
    }

    const normalizedSlug = this.normalizeSlug(dto.slug);
    const existing = await this.prisma.organization.findUnique({
      where: { slug: normalizedSlug },
      select: { id: true }
    });
    if (existing) {
      throw new ConflictException('Organization slug is already in use');
    }

    const created = await this.prisma.$transaction(async (tx) => {
      const organization = await tx.organization.create({
        data: {
          name: dto.name,
          slug: normalizedSlug,
          status: OrganizationStatus.ACTIVE
        }
      });

      const organizationAdminRole = await tx.role.create({
        data: {
          name: 'Organization Admin',
          code: 'organization_admin',
          type: RoleType.ORGANIZATION,
          organizationId: organization.id
        }
      });

      const userRole = await tx.role.create({
        data: {
          name: 'User',
          code: 'user',
          type: RoleType.ORGANIZATION,
          organizationId: organization.id
        }
      });

      const permissions = await tx.permission.findMany({
        where: { code: { in: [...ORG_ADMIN_PERMISSION_CODES] } },
        select: { id: true, code: true }
      });
      if (permissions.length !== ORG_ADMIN_PERMISSION_CODES.length) {
        throw new InternalServerErrorException('Core permissions are not initialized');
      }

      await tx.rolePermission.createMany({
        data: permissions.map((permission) => ({
          roleId: organizationAdminRole.id,
          permissionId: permission.id
        }))
      });

      return { organization, organizationAdminRoleId: organizationAdminRole.id, userRoleId: userRole.id };
    });

    await this.casbinService.reloadRolePolicies(created.organizationAdminRoleId);
    await this.casbinService.reloadRolePolicies(created.userRoleId);

    const fullOrganization = await this.prisma.organization.findUniqueOrThrow({
      where: { id: created.organization.id },
      include: ORGANIZATION_INCLUDE
    });
    await this.auditLogsService.write({
      action: AUDIT_ACTIONS.ORGANIZATION_CREATE,
      entityType: AUDIT_ENTITY_TYPES.ORGANIZATION,
      entityId: fullOrganization.id,
      userId: currentUser.id,
      organizationId: fullOrganization.id,
      metadata: { name: fullOrganization.name, slug: fullOrganization.slug },
      ip: requestMetadata?.ip,
      userAgent: requestMetadata?.userAgent
    });
    return this.toOrganizationResponse(fullOrganization);
  }

  async update(
    currentUser: CurrentUser,
    currentOrganization: CurrentOrganization,
    organizationId: string,
    dto: UpdateOrganizationDto,
    requestMetadata?: RequestMetadata
  ): Promise<OrganizationResponseDto> {
    if (!this.isSuperAdmin(currentUser) && organizationId !== currentOrganization.id) {
      throw new NotFoundException('Organization not found');
    }

    const exists = await this.prisma.organization.findUnique({
      where: { id: organizationId },
      select: { id: true }
    });
    if (!exists) {
      throw new NotFoundException('Organization not found');
    }

    const data: Prisma.OrganizationUpdateInput = {};
    if (dto.name !== undefined) {
      data.name = dto.name;
    }
    if (dto.slug !== undefined) {
      const normalizedSlug = this.normalizeSlug(dto.slug);
      const duplicate = await this.prisma.organization.findFirst({
        where: {
          slug: normalizedSlug,
          id: { not: organizationId }
        },
        select: { id: true }
      });
      if (duplicate) {
        throw new ConflictException('Organization slug is already in use');
      }
      data.slug = normalizedSlug;
    }

    const updated = await this.prisma.organization.update({
      where: { id: organizationId },
      data,
      include: ORGANIZATION_INCLUDE
    });
    const changedFields = [dto.name !== undefined ? 'name' : null, dto.slug !== undefined ? 'slug' : null].filter(Boolean);
    await this.auditLogsService.write({
      action: AUDIT_ACTIONS.ORGANIZATION_UPDATE,
      entityType: AUDIT_ENTITY_TYPES.ORGANIZATION,
      entityId: updated.id,
      userId: currentUser.id,
      organizationId: updated.id,
      metadata: { changedFields },
      ip: requestMetadata?.ip,
      userAgent: requestMetadata?.userAgent
    });

    return this.toOrganizationResponse(updated);
  }

  async updateStatus(
    currentUser: CurrentUser,
    organizationId: string,
    status: OrganizationStatus,
    requestMetadata?: RequestMetadata
  ): Promise<OrganizationResponseDto> {
    if (!this.isSuperAdmin(currentUser)) {
      throw new ForbiddenException('Only super admin can change organization status');
    }

    const organization = await this.prisma.organization.findUnique({
      where: { id: organizationId },
      include: ORGANIZATION_INCLUDE
    });
    if (!organization) {
      throw new NotFoundException('Organization not found');
    }

    if (status !== OrganizationStatus.ACTIVE && organization.status === OrganizationStatus.ACTIVE) {
      const activeCount = await this.prisma.organization.count({
        where: {
          status: OrganizationStatus.ACTIVE,
          id: { not: organizationId }
        }
      });
      if (activeCount < 1) {
        throw new ConflictException('Cannot deactivate the last active organization');
      }
    }

    const updated = await this.prisma.organization.update({
      where: { id: organizationId },
      data: { status },
      include: ORGANIZATION_INCLUDE
    });
    await this.auditLogsService.write({
      action: AUDIT_ACTIONS.ORGANIZATION_STATUS_UPDATE,
      entityType: AUDIT_ENTITY_TYPES.ORGANIZATION,
      entityId: updated.id,
      userId: currentUser.id,
      organizationId: updated.id,
      metadata: { status },
      ip: requestMetadata?.ip,
      userAgent: requestMetadata?.userAgent
    });
    return this.toOrganizationResponse(updated);
  }

  private normalizeSlug(slug: string): string {
    return slug.trim().toLowerCase();
  }

  private isSuperAdmin(user: CurrentUser): boolean {
    return user.systemRoles.includes('super_admin');
  }

  private toOrganizationResponse(
    organization: Prisma.OrganizationGetPayload<{ include: typeof ORGANIZATION_INCLUDE }>
  ): OrganizationResponseDto {
    return {
      id: organization.id,
      name: organization.name,
      slug: organization.slug,
      status: organization.status,
      usersCount: organization._count.users,
      rolesCount: organization._count.roles,
      createdAt: organization.createdAt,
      updatedAt: organization.updatedAt
    };
  }
}

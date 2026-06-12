import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException
} from '@nestjs/common';
import {
  OrganizationStatus,
  Prisma,
  RoleType,
  SystemLogLevel,
  UserStatus
} from '@prisma/client';
import * as argon2 from 'argon2';
import { CasbinService } from '../../infrastructure/casbin/casbin.service';
import { PrismaService } from '../../infrastructure/prisma/prisma.service';
import { RequestMetadata } from '../../common/utils/request-metadata.util';
import { AuditLogsService } from '../audit-logs/audit-logs.service';
import {
  AUDIT_ACTIONS,
  AUDIT_ENTITY_TYPES
} from '../audit-logs/constants/audit-actions.constants';
import { CurrentUserCacheService } from '../auth/current-user-cache.service';
import { CurrentUser } from '../auth/types/current-user.type';
import { NOTIFICATION_EVENTS } from '../notifications/constants/notification-events.constants';
import { NotificationsService } from '../notifications/notifications.service';
import { NotifyDto } from '../notifications/types/notification.types';
import { RealtimeEventsService } from '../realtime-events/realtime-events.service';
import { SYSTEM_LOG_EVENTS } from '../system-logs/constants/system-log-events.constants';
import { SYSTEM_LOG_SOURCES } from '../system-logs/constants/system-log-sources.constants';
import { SystemLogsService } from '../system-logs/system-logs.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateMyProfileDto } from './dto/update-my-profile.dto';
import { UpdateUserOrganizationsDto } from './dto/update-user-organizations.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UserResponseDto } from './dto/user-response.dto';
import { UsersListQueryDto } from './dto/users-list-query.dto';

const USER_INCLUDE = {
  memberships: {
    include: {
      organization: true,
      role: true
    }
  },
  systemRoles: {
    include: {
      role: true
    }
  }
} satisfies Prisma.UserInclude;

@Injectable()
export class UsersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly casbinService: CasbinService,
    private readonly auditLogsService: AuditLogsService,
    private readonly notificationsService: NotificationsService,
    private readonly systemLogsService: SystemLogsService,
    private readonly currentUserCacheService: CurrentUserCacheService,
    private readonly realtimeEventsService: RealtimeEventsService
  ) {}

  async findAll(
    organizationId: string,
    query: UsersListQueryDto
  ): Promise<{
    items: UserResponseDto[];
    meta: { page: number; limit: number; total: number; totalPages: number };
  }> {
    const page = query.page ?? 1;
    const limit = Math.min(query.limit ?? 20, 100);
    const skip = (page - 1) * limit;
    const search = query.search?.trim();

    const where: Prisma.UserWhereInput = {
      memberships: {
        some: {
          organizationId
        }
      },
      ...(query.status ? { status: query.status } : {}),
      ...(search
        ? {
            OR: [
              { email: { contains: search, mode: 'insensitive' } },
              { name: { contains: search, mode: 'insensitive' } }
            ]
          }
        : {})
    };

    const [items, total] = await this.prisma.$transaction([
      this.prisma.user.findMany({
        where,
        include: USER_INCLUDE,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' }
      }),
      this.prisma.user.count({ where })
    ]);

    return {
      items: items.map((user) => this.toUserResponse(user)),
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit) || 1
      }
    };
  }

  async findMe(userId: string): Promise<UserResponseDto> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: USER_INCLUDE
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return this.toUserResponse(user);
  }

  async updateMe(
    currentUser: CurrentUser,
    dto: UpdateMyProfileDto,
    requestMetadata?: RequestMetadata
  ): Promise<UserResponseDto> {
    const existingUser = await this.prisma.user.findUnique({
      where: { id: currentUser.id },
      select: { name: true }
    });
    if (!existingUser) {
      throw new NotFoundException('User not found');
    }
    const nameChanged =
      dto.name !== undefined && dto.name !== existingUser.name;

    const user = await this.prisma.user.update({
      where: { id: currentUser.id },
      data: {
        ...(dto.name !== undefined ? { name: dto.name } : {})
      },
      include: USER_INCLUDE
    });

    await this.currentUserCacheService.invalidate(currentUser.id);
    const changedFields = [dto.name !== undefined ? 'name' : null].filter(
      Boolean
    );
    await this.auditLogsService.write({
      action: AUDIT_ACTIONS.USER_PROFILE_UPDATE,
      entityType: AUDIT_ENTITY_TYPES.USER,
      entityId: currentUser.id,
      userId: currentUser.id,
      organizationId: null,
      metadata: { changedFields },
      ip: requestMetadata?.ip,
      userAgent: requestMetadata?.userAgent
    });

    if (nameChanged) {
      await this.notifyUserSafely(
        {
          event: NOTIFICATION_EVENTS.USER_PROFILE_UPDATED,
          organizationId: null,
          recipientUserIds: [user.id],
          payload: {
            userId: user.id,
            email: user.email,
            name: user.name,
            changedFields: 'name'
          }
        },
        currentUser.id,
        null,
        'Failed to create user.profile_updated notification',
        { targetUserId: user.id, changedFields: ['name'] }
      );
    }

    return this.toUserResponse(user);
  }

  async findByIdInOrganization(
    userId: string,
    currentUser: CurrentUser,
    organizationId: string
  ): Promise<UserResponseDto> {
    const where: Prisma.UserWhereInput = this.isSuperAdmin(currentUser)
      ? { id: userId }
      : {
          id: userId,
          memberships: {
            some: {
              organizationId
            }
          }
        };

    const user = await this.prisma.user.findFirst({
      where,
      include: USER_INCLUDE
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return this.toUserResponse(user);
  }

  async create(
    organizationId: string,
    currentUser: CurrentUser,
    dto: CreateUserDto,
    requestMetadata?: RequestMetadata
  ): Promise<UserResponseDto> {
    const email = dto.email.trim().toLowerCase();
    const targetOrganizationId = await this.resolveTargetOrganizationId(
      organizationId,
      currentUser,
      dto.organizationId
    );

    const [existingUser, role, targetOrganization] = await Promise.all([
      this.prisma.user.findUnique({ where: { email }, select: { id: true } }),
      this.prisma.role.findUnique({ where: { id: dto.roleId } }),
      this.prisma.organization.findUniqueOrThrow({
        where: { id: targetOrganizationId },
        select: { id: true, name: true, slug: true }
      })
    ]);

    if (existingUser) {
      throw new ConflictException('Email is already in use');
    }
    this.ensureOrganizationRole(role, targetOrganizationId);

    const user = await this.prisma.$transaction(async (tx) => {
      const createdUser = await tx.user.create({
        data: {
          email,
          name: dto.name,
          passwordHash: await argon2.hash(dto.password),
          status: UserStatus.ACTIVE,
          memberships: {
            create: {
              organizationId: targetOrganizationId,
              roleId: dto.roleId,
              status: UserStatus.ACTIVE
            }
          }
        },
        include: USER_INCLUDE
      });

      return createdUser;
    });

    await this.casbinService.reloadUserOrganizationRole(
      user.id,
      targetOrganizationId
    );
    await this.auditLogsService.write({
      action: AUDIT_ACTIONS.USER_CREATE,
      entityType: AUDIT_ENTITY_TYPES.USER,
      entityId: user.id,
      userId: currentUser.id,
      organizationId: targetOrganizationId,
      metadata: {
        email,
        roleId: dto.roleId,
        organizationId: targetOrganizationId
      },
      ip: requestMetadata?.ip,
      userAgent: requestMetadata?.userAgent
    });
    await this.notifyUserSafely(
      {
        event: NOTIFICATION_EVENTS.USER_CREATED,
        organizationId: targetOrganization.id,
        recipientUserIds: [user.id],
        payload: {
          userId: user.id,
          email: user.email,
          name: user.name,
          organizationName: targetOrganization.name,
          organizationSlug: targetOrganization.slug,
          roleCode: role!.code,
          roleName: role!.name
        }
      },
      currentUser.id,
      targetOrganization.id,
      'Failed to create user.created notification',
      { targetUserId: user.id }
    );
    return this.toUserResponse(user);
  }

  async update(
    userId: string,
    currentUser: CurrentUser,
    organizationId: string,
    dto: UpdateUserDto,
    requestMetadata?: RequestMetadata
  ): Promise<UserResponseDto> {
    const targetOrganizationId = await this.resolveTargetOrganizationId(
      organizationId,
      currentUser,
      dto.organizationId
    );
    const membership = await this.prisma.userOrganization.findUnique({
      where: {
        userId_organizationId: {
          userId,
          organizationId: targetOrganizationId
        }
      },
      include: {
        organization: true,
        role: true,
        user: {
          select: {
            id: true,
            email: true,
            name: true
          }
        }
      }
    });

    if (!membership) {
      throw new NotFoundException('User not found');
    }

    if (dto.roleId) {
      const role = await this.prisma.role.findUnique({
        where: { id: dto.roleId }
      });
      this.ensureOrganizationRole(role, targetOrganizationId);
    }
    const nameChanged =
      dto.name !== undefined && dto.name !== membership.user.name;
    const roleChanged =
      dto.roleId !== undefined && dto.roleId !== membership.roleId;

    const user = await this.prisma.$transaction(async (tx) => {
      if (dto.name !== undefined) {
        await tx.user.update({
          where: { id: userId },
          data: { name: dto.name }
        });
      }

      if (dto.roleId) {
        await tx.userOrganization.update({
          where: {
            userId_organizationId: {
              userId,
              organizationId: targetOrganizationId
            }
          },
          data: {
            roleId: dto.roleId
          }
        });
      }

      return tx.user.findUniqueOrThrow({
        where: { id: userId },
        include: USER_INCLUDE
      });
    });

    if (dto.roleId) {
      await this.casbinService.reloadUserOrganizationRole(
        userId,
        targetOrganizationId
      );
    }
    await this.currentUserCacheService.invalidate(userId);
    const changedFields = [
      dto.name !== undefined ? 'name' : null,
      dto.roleId ? 'roleId' : null,
      dto.organizationId ? 'organizationId' : null
    ].filter(Boolean);
    await this.auditLogsService.write({
      action: AUDIT_ACTIONS.USER_UPDATE,
      entityType: AUDIT_ENTITY_TYPES.USER,
      entityId: user.id,
      userId: currentUser.id,
      organizationId: targetOrganizationId,
      metadata: { changedFields, organizationId: targetOrganizationId },
      ip: requestMetadata?.ip,
      userAgent: requestMetadata?.userAgent
    });

    if (nameChanged) {
      await this.notifyUserSafely(
        {
          event: NOTIFICATION_EVENTS.USER_PROFILE_UPDATED,
          organizationId: targetOrganizationId,
          recipientUserIds: [user.id],
          payload: {
            userId: user.id,
            email: user.email,
            name: user.name,
            changedFields: 'name'
          }
        },
        currentUser.id,
        targetOrganizationId,
        'Failed to create user.profile_updated notification',
        { targetUserId: user.id, changedFields: ['name'] }
      );
    }

    if (roleChanged) {
      const updatedMembership = user.memberships.find(
        (item) => item.organizationId === targetOrganizationId
      );
      if (updatedMembership) {
        await this.notifyUserSafely(
          {
            event: NOTIFICATION_EVENTS.USER_ORGANIZATIONS_CHANGED,
            organizationId: targetOrganizationId,
            recipientUserIds: [user.id],
            payload: {
              userId: user.id,
              email: user.email,
              name: user.name,
              action: 'updated',
              organizationName: updatedMembership.organization.name,
              organizationSlug: updatedMembership.organization.slug,
              roleCode: updatedMembership.role.code,
              roleName: updatedMembership.role.name,
              membershipStatus: updatedMembership.status
            }
          },
          currentUser.id,
          targetOrganizationId,
          'Failed to create user.organizations_changed notification',
          { targetUserId: user.id, organizationId: targetOrganizationId }
        );
      }
    }

    return this.toUserResponse(user);
  }

  async updateStatus(
    userId: string,
    currentUser: CurrentUser,
    organizationId: string,
    status: UserStatus,
    requestMetadata?: RequestMetadata
  ): Promise<UserResponseDto> {
    if (!this.isSuperAdmin(currentUser)) {
      const membership = await this.prisma.userOrganization.findUnique({
        where: {
          userId_organizationId: {
            userId,
            organizationId
          }
        }
      });

      if (!membership) {
        throw new NotFoundException('User not found');
      }
    }

    if (currentUser.id === userId && status !== UserStatus.ACTIVE) {
      throw new BadRequestException(
        'You cannot change your own status to inactive or blocked'
      );
    }

    const targetUser = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        systemRoles: {
          include: { role: true }
        }
      }
    });

    if (!targetUser) {
      throw new NotFoundException('User not found');
    }

    const actorOrg = currentUser.organizations.find(
      (organization) => organization.id === organizationId
    );
    const actorIsOrgAdmin = actorOrg?.role === 'organization_admin';
    const targetIsSuperAdmin = targetUser.systemRoles.some(
      (systemRole) => systemRole.role.code === 'super_admin'
    );

    if (actorIsOrgAdmin && targetIsSuperAdmin && status !== UserStatus.ACTIVE) {
      throw new ForbiddenException(
        'Organization admin cannot block or deactivate super admin'
      );
    }

    const updatedUser = await this.prisma.user.update({
      where: { id: userId },
      data: { status },
      include: USER_INCLUDE
    });
    await this.currentUserCacheService.invalidate(userId);
    if (status !== UserStatus.ACTIVE) {
      this.realtimeEventsService.emitUserDeactivated(userId);
    }
    await this.auditLogsService.write({
      action: AUDIT_ACTIONS.USER_STATUS_UPDATE,
      entityType: AUDIT_ENTITY_TYPES.USER,
      entityId: updatedUser.id,
      userId: currentUser.id,
      organizationId,
      metadata: { status },
      ip: requestMetadata?.ip,
      userAgent: requestMetadata?.userAgent
    });

    if (targetUser.status !== updatedUser.status) {
      await this.notifyUserSafely(
        {
          event: NOTIFICATION_EVENTS.USER_STATUS_CHANGED,
          organizationId,
          recipientUserIds: [updatedUser.id],
          payload: {
            userId: updatedUser.id,
            email: updatedUser.email,
            name: updatedUser.name,
            status: updatedUser.status
          }
        },
        currentUser.id,
        organizationId,
        'Failed to create user.status_changed notification',
        {
          targetUserId: updatedUser.id,
          previousStatus: targetUser.status,
          status: updatedUser.status
        }
      );
    }

    return this.toUserResponse(updatedUser);
  }

  async updateOrganizations(
    userId: string,
    currentUser: CurrentUser,
    currentOrganizationId: string,
    dto: UpdateUserOrganizationsDto,
    requestMetadata?: RequestMetadata
  ): Promise<UserResponseDto> {
    const targetUser = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true, name: true, status: true }
    });
    if (!targetUser) {
      throw new NotFoundException('User not found');
    }

    const isSuperAdmin = this.isSuperAdmin(currentUser);
    const requestedOrganizations = dto.organizations ?? [];
    const requestedOrganizationIds = requestedOrganizations.map(
      (membership) => membership.organizationId
    );
    if (
      new Set(requestedOrganizationIds).size !== requestedOrganizationIds.length
    ) {
      throw new BadRequestException(
        'Duplicate organization memberships are not allowed'
      );
    }

    if (!isSuperAdmin) {
      if (
        requestedOrganizations.length !== 1 ||
        requestedOrganizations[0]?.organizationId !== currentOrganizationId
      ) {
        throw new ForbiddenException(
          'You can manage only the active organization membership'
        );
      }
    }

    const existingMemberships = await this.prisma.userOrganization.findMany({
      where: { userId },
      include: { organization: true, role: true }
    });
    const affectedOrganizationIds = new Set(
      existingMemberships.map((membership) => membership.organizationId)
    );
    const changedOrganizationIds = new Set<string>();
    const existingByOrganizationId = new Map(
      existingMemberships.map((membership) => [
        membership.organizationId,
        membership
      ])
    );

    for (const requested of requestedOrganizations) {
      const organization = await this.prisma.organization.findUnique({
        where: { id: requested.organizationId },
        select: { id: true, status: true }
      });
      if (!organization) {
        throw new BadRequestException('Organization not found');
      }
      if (
        (requested.status ?? UserStatus.ACTIVE) === UserStatus.ACTIVE &&
        organization.status !== OrganizationStatus.ACTIVE
      ) {
        throw new BadRequestException(
          'Active membership requires an active organization'
        );
      }

      const role = await this.prisma.role.findUnique({
        where: { id: requested.roleId }
      });
      this.ensureOrganizationRole(role, requested.organizationId);
    }

    const nextCurrentMembership = requestedOrganizations.find(
      (membership) => membership.organizationId === currentOrganizationId
    );
    if (
      currentUser.id === userId &&
      (!nextCurrentMembership ||
        (nextCurrentMembership.status ?? UserStatus.ACTIVE) !==
          UserStatus.ACTIVE)
    ) {
      throw new BadRequestException(
        'You cannot remove yourself from the active organization'
      );
    }

    const projectedActiveMemberships = new Map<string, UserStatus>();
    for (const existing of existingMemberships) {
      projectedActiveMemberships.set(existing.organizationId, existing.status);
    }
    for (const requested of requestedOrganizations) {
      projectedActiveMemberships.set(
        requested.organizationId,
        requested.status ?? UserStatus.ACTIVE
      );
    }
    if (isSuperAdmin) {
      const requestedSet = new Set(requestedOrganizationIds);
      for (const existing of existingMemberships) {
        if (!requestedSet.has(existing.organizationId)) {
          projectedActiveMemberships.set(
            existing.organizationId,
            UserStatus.INACTIVE
          );
        }
      }
    }
    if (
      targetUser.status === UserStatus.ACTIVE &&
      ![...projectedActiveMemberships.values()].some(
        (status) => status === UserStatus.ACTIVE
      )
    ) {
      throw new BadRequestException(
        'Active user must have at least one active organization membership'
      );
    }

    const user = await this.prisma.$transaction(async (tx) => {
      if (isSuperAdmin) {
        const requestedSet = new Set(requestedOrganizationIds);
        for (const existing of existingMemberships) {
          if (
            !requestedSet.has(existing.organizationId) &&
            existing.status !== UserStatus.INACTIVE
          ) {
            await tx.userOrganization.update({
              where: {
                userId_organizationId: {
                  userId,
                  organizationId: existing.organizationId
                }
              },
              data: { status: UserStatus.INACTIVE }
            });
            affectedOrganizationIds.add(existing.organizationId);
            changedOrganizationIds.add(existing.organizationId);
          }
        }
      }

      for (const requested of requestedOrganizations) {
        const status = requested.status ?? UserStatus.ACTIVE;
        const existing = existingByOrganizationId.get(requested.organizationId);
        if (existing) {
          if (
            existing.roleId !== requested.roleId ||
            existing.status !== status
          ) {
            changedOrganizationIds.add(requested.organizationId);
          }
          await tx.userOrganization.update({
            where: {
              userId_organizationId: {
                userId,
                organizationId: requested.organizationId
              }
            },
            data: {
              roleId: requested.roleId,
              status
            }
          });
        } else {
          if (!isSuperAdmin) {
            throw new ForbiddenException(
              'You cannot add organization memberships'
            );
          }
          await tx.userOrganization.create({
            data: {
              userId,
              organizationId: requested.organizationId,
              roleId: requested.roleId,
              status
            }
          });
          changedOrganizationIds.add(requested.organizationId);
        }
        affectedOrganizationIds.add(requested.organizationId);
      }

      return tx.user.findUniqueOrThrow({
        where: { id: userId },
        include: USER_INCLUDE
      });
    });

    const afterMemberships = await this.prisma.userOrganization.findMany({
      where: { userId },
      select: { organizationId: true }
    });
    for (const membership of afterMemberships) {
      affectedOrganizationIds.add(membership.organizationId);
    }

    await Promise.all(
      [...affectedOrganizationIds].map((affectedOrganizationId) =>
        this.casbinService.reloadUserOrganizationRole(
          userId,
          affectedOrganizationId
        )
      )
    );
    await this.currentUserCacheService.invalidate(userId);
    await this.auditLogsService.write({
      action: AUDIT_ACTIONS.USER_ORGANIZATIONS_UPDATE,
      entityType: AUDIT_ENTITY_TYPES.USER,
      entityId: userId,
      userId: currentUser.id,
      organizationId: currentOrganizationId,
      metadata: {
        organizations: requestedOrganizations.map((membership) => ({
          organizationId: membership.organizationId,
          roleId: membership.roleId,
          status: membership.status ?? UserStatus.ACTIVE
        }))
      },
      ip: requestMetadata?.ip,
      userAgent: requestMetadata?.userAgent
    });

    await this.notifyOrganizationsChangedSafely(
      user,
      changedOrganizationIds,
      currentUser.id,
      currentOrganizationId
    );

    return this.toUserResponse(user);
  }

  async removeOrganization(
    userId: string,
    currentUser: CurrentUser,
    currentOrganizationId: string,
    organizationId: string,
    requestMetadata?: RequestMetadata
  ): Promise<UserResponseDto> {
    if (!this.isSuperAdmin(currentUser)) {
      throw new ForbiddenException(
        'Only super admins can remove organization memberships'
      );
    }
    if (currentUser.id === userId && organizationId === currentOrganizationId) {
      throw new BadRequestException(
        'You cannot remove yourself from the active organization'
      );
    }

    const membership = await this.prisma.userOrganization.findUnique({
      where: {
        userId_organizationId: {
          userId,
          organizationId
        }
      },
      include: {
        organization: true,
        role: true,
        user: {
          select: {
            id: true,
            email: true,
            name: true,
            status: true
          }
        }
      }
    });
    if (!membership) {
      throw new NotFoundException('Organization membership not found');
    }

    const activeMembershipsCount = await this.prisma.userOrganization.count({
      where: {
        userId,
        status: UserStatus.ACTIVE
      }
    });
    if (
      membership.user.status === UserStatus.ACTIVE &&
      activeMembershipsCount -
        (membership.status === UserStatus.ACTIVE ? 1 : 0) <=
        0
    ) {
      throw new BadRequestException(
        'Active user must have at least one active organization membership'
      );
    }

    const user = await this.prisma.$transaction(async (tx) => {
      await tx.userOrganization.delete({
        where: {
          userId_organizationId: {
            userId,
            organizationId
          }
        }
      });

      return tx.user.findUniqueOrThrow({
        where: { id: userId },
        include: USER_INCLUDE
      });
    });

    await this.casbinService.reloadUserOrganizationRole(userId, organizationId);
    await this.currentUserCacheService.invalidate(userId);
    await this.auditLogsService.write({
      action: AUDIT_ACTIONS.USER_ORGANIZATION_REMOVE,
      entityType: AUDIT_ENTITY_TYPES.USER,
      entityId: userId,
      userId: currentUser.id,
      organizationId: currentOrganizationId,
      metadata: { organizationId },
      ip: requestMetadata?.ip,
      userAgent: requestMetadata?.userAgent
    });

    await this.notifyUserSafely(
      {
        event: NOTIFICATION_EVENTS.USER_ORGANIZATIONS_CHANGED,
        organizationId: membership.organization.id,
        recipientUserIds: [membership.user.id],
        payload: {
          userId: membership.user.id,
          email: membership.user.email,
          name: membership.user.name,
          action: 'removed',
          organizationName: membership.organization.name,
          organizationSlug: membership.organization.slug,
          roleCode: membership.role.code,
          roleName: membership.role.name,
          membershipStatus: 'REMOVED'
        }
      },
      currentUser.id,
      currentOrganizationId,
      'Failed to create user.organizations_changed notification',
      {
        targetUserId: membership.user.id,
        organizationId: membership.organization.id,
        action: 'removed'
      }
    );

    return this.toUserResponse(user);
  }

  private async notifyOrganizationsChangedSafely(
    user: Prisma.UserGetPayload<{ include: typeof USER_INCLUDE }>,
    changedOrganizationIds: Set<string>,
    actorUserId: string,
    fallbackOrganizationId: string
  ): Promise<void> {
    if (changedOrganizationIds.size === 0) {
      return;
    }

    const changedMemberships = user.memberships.filter((membership) =>
      changedOrganizationIds.has(membership.organizationId)
    );
    const membership =
      changedOrganizationIds.size === 1 ? changedMemberships[0] : null;

    await this.notifyUserSafely(
      {
        event: NOTIFICATION_EVENTS.USER_ORGANIZATIONS_CHANGED,
        organizationId: membership?.organizationId ?? fallbackOrganizationId,
        recipientUserIds: [user.id],
        payload: {
          userId: user.id,
          email: user.email,
          name: user.name,
          action: 'updated',
          organizationName:
            membership?.organization.name ?? 'Multiple organizations',
          organizationSlug: membership?.organization.slug ?? '',
          roleCode: membership?.role.code ?? '',
          roleName: membership?.role.name ?? '',
          membershipStatus: membership?.status ?? 'UPDATED'
        }
      },
      actorUserId,
      membership?.organizationId ?? fallbackOrganizationId,
      'Failed to create user.organizations_changed notification',
      {
        targetUserId: user.id,
        organizationIds: [...changedOrganizationIds],
        action: 'updated'
      }
    );
  }

  private async notifyUserSafely(
    dto: NotifyDto,
    actorUserId: string,
    organizationId: string | null,
    failureMessage: string,
    context: Record<string, unknown> = {}
  ): Promise<void> {
    if (dto.recipientUserIds.filter(Boolean).length === 0) {
      return;
    }

    try {
      await this.notificationsService.notify(dto);
    } catch (error) {
      await this.systemLogsService.write({
        level: SystemLogLevel.ERROR,
        source: SYSTEM_LOG_SOURCES.NOTIFICATIONS,
        message: failureMessage,
        context: {
          event: SYSTEM_LOG_EVENTS.NOTIFICATION_SEND_FAILED,
          notificationEvent: dto.event,
          ...context
        },
        errorStack:
          error instanceof Error
            ? (error.stack ?? error.message)
            : String(error),
        userId: actorUserId,
        organizationId
      });
    }
  }

  private isSuperAdmin(currentUser: CurrentUser): boolean {
    return currentUser.systemRoles.includes('super_admin');
  }

  private async resolveTargetOrganizationId(
    currentOrganizationId: string,
    currentUser: CurrentUser,
    requestedOrganizationId?: string
  ): Promise<string> {
    const targetOrganizationId =
      requestedOrganizationId ?? currentOrganizationId;
    if (
      targetOrganizationId !== currentOrganizationId &&
      !this.isSuperAdmin(currentUser)
    ) {
      throw new ForbiddenException(
        'You cannot manage users in another organization'
      );
    }

    const organization = await this.prisma.organization.findUnique({
      where: { id: targetOrganizationId },
      select: { id: true, status: true }
    });
    if (!organization || organization.status !== OrganizationStatus.ACTIVE) {
      throw new BadRequestException('Organization is not active');
    }

    return targetOrganizationId;
  }

  private ensureOrganizationRole(
    role: { id: string; type: RoleType; organizationId: string | null } | null,
    organizationId: string
  ): void {
    if (!role) {
      throw new BadRequestException('Role not found');
    }
    if (role.type !== RoleType.ORGANIZATION) {
      throw new BadRequestException(
        'System roles cannot be assigned via this endpoint'
      );
    }
    if (role.organizationId !== organizationId) {
      throw new BadRequestException(
        'Role does not belong to target organization'
      );
    }
  }

  private toUserResponse(
    user: Prisma.UserGetPayload<{ include: typeof USER_INCLUDE }>
  ): UserResponseDto {
    return {
      id: user.id,
      email: user.email,
      name: user.name,
      status: user.status,
      organizations: user.memberships.map((membership) => ({
        id: membership.organization.id,
        name: membership.organization.name,
        slug: membership.organization.slug,
        status: membership.organization.status,
        membershipStatus: membership.status,
        role: membership.role.code,
        roleId: membership.role.id,
        roleName: membership.role.name
      })),
      systemRoles: user.systemRoles.map((systemRole) => systemRole.role.code),
      systemRoleDetails: user.systemRoles.map((systemRole) => ({
        id: systemRole.role.id,
        code: systemRole.role.code,
        name: systemRole.role.name
      })),
      createdAt: user.createdAt,
      updatedAt: user.updatedAt
    };
  }
}

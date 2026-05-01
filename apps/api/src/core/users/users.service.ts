import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException
} from '@nestjs/common';
import { Prisma, RoleType, UserStatus } from '@prisma/client';
import * as argon2 from 'argon2';
import { CasbinService } from '../../infrastructure/casbin/casbin.service';
import { PrismaService } from '../../infrastructure/prisma/prisma.service';
import { CurrentUser } from '../auth/types/current-user.type';
import { CreateUserDto } from './dto/create-user.dto';
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
    private readonly casbinService: CasbinService
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
            OR: [{ email: { contains: search, mode: 'insensitive' } }, { name: { contains: search, mode: 'insensitive' } }]
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

  async findByIdInOrganization(userId: string, organizationId: string): Promise<UserResponseDto> {
    const user = await this.prisma.user.findFirst({
      where: {
        id: userId,
        memberships: {
          some: {
            organizationId
          }
        }
      },
      include: USER_INCLUDE
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return this.toUserResponse(user);
  }

  async create(organizationId: string, dto: CreateUserDto): Promise<UserResponseDto> {
    const email = dto.email.trim().toLowerCase();

    const [existingUser, role] = await Promise.all([
      this.prisma.user.findUnique({ where: { email }, select: { id: true } }),
      this.prisma.role.findUnique({ where: { id: dto.roleId } })
    ]);

    if (existingUser) {
      throw new ConflictException('Email is already in use');
    }
    this.ensureOrganizationRole(role, organizationId);

    const user = await this.prisma.$transaction(async (tx) => {
      const createdUser = await tx.user.create({
        data: {
          email,
          name: dto.name,
          passwordHash: await argon2.hash(dto.password),
          status: UserStatus.ACTIVE,
          memberships: {
            create: {
              organizationId,
              roleId: dto.roleId,
              status: UserStatus.ACTIVE
            }
          }
        },
        include: USER_INCLUDE
      });

      return createdUser;
    });

    await this.casbinService.reloadPolicies();
    return this.toUserResponse(user);
  }

  async update(userId: string, organizationId: string, dto: UpdateUserDto): Promise<UserResponseDto> {
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

    if (dto.roleId) {
      const role = await this.prisma.role.findUnique({ where: { id: dto.roleId } });
      this.ensureOrganizationRole(role, organizationId);
    }

    const user = await this.prisma.$transaction(async (tx) => {
      if (dto.name !== undefined) {
        await tx.user.update({ where: { id: userId }, data: { name: dto.name } });
      }

      if (dto.roleId) {
        await tx.userOrganization.update({
          where: {
            userId_organizationId: {
              userId,
              organizationId
            }
          },
          data: {
            roleId: dto.roleId
          }
        });
      }

      return tx.user.findUniqueOrThrow({ where: { id: userId }, include: USER_INCLUDE });
    });

    if (dto.roleId) {
      await this.casbinService.reloadPolicies();
    }

    return this.toUserResponse(user);
  }

  async updateStatus(
    userId: string,
    currentUser: CurrentUser,
    organizationId: string,
    status: UserStatus
  ): Promise<UserResponseDto> {
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

    if (currentUser.id === userId && status !== UserStatus.ACTIVE) {
      throw new BadRequestException('You cannot change your own status to inactive or blocked');
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

    const actorOrg = currentUser.organizations.find((organization) => organization.id === organizationId);
    const actorIsOrgAdmin = actorOrg?.role === 'organization_admin';
    const targetIsSuperAdmin = targetUser.systemRoles.some((systemRole) => systemRole.role.code === 'super_admin');

    if (actorIsOrgAdmin && targetIsSuperAdmin && status !== UserStatus.ACTIVE) {
      throw new ForbiddenException('Organization admin cannot block or deactivate super admin');
    }

    const updatedUser = await this.prisma.user.update({
      where: { id: userId },
      data: { status },
      include: USER_INCLUDE
    });

    await this.casbinService.reloadPolicies();
    return this.toUserResponse(updatedUser);
  }

  private ensureOrganizationRole(
    role: { id: string; type: RoleType; organizationId: string | null } | null,
    organizationId: string
  ): void {
    if (!role) {
      throw new BadRequestException('Role not found');
    }
    if (role.type !== RoleType.ORGANIZATION) {
      throw new BadRequestException('System roles cannot be assigned via this endpoint');
    }
    if (role.organizationId !== organizationId) {
      throw new BadRequestException('Role does not belong to current organization');
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
        role: membership.role.code
      })),
      systemRoles: user.systemRoles.map((systemRole) => systemRole.role.code),
      createdAt: user.createdAt,
      updatedAt: user.updatedAt
    };
  }
}

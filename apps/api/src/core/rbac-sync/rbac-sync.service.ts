import { Injectable } from '@nestjs/common';
import { RoleType, SystemLogLevel } from '@prisma/client';
import { CasbinService } from '../../infrastructure/casbin/casbin.service';
import { PrismaService } from '../../infrastructure/prisma/prisma.service';
import { SYSTEM_LOG_SOURCES } from '../system-logs/constants/system-log-sources.constants';
import { SystemLogsService } from '../system-logs/system-logs.service';

@Injectable()
export class RbacSyncService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly casbinService: CasbinService,
    private readonly systemLogsService: SystemLogsService
  ) {}

  async syncSuperAdminPermissions(reason: string): Promise<{ addedCount: number }> {
    const superAdminRole = await this.prisma.role.findFirst({
      where: {
        code: 'super_admin',
        type: RoleType.SYSTEM,
        organizationId: null
      },
      select: { id: true }
    });

    if (!superAdminRole) {
      return { addedCount: 0 };
    }

    const [allPermissions, currentLinks] = await this.prisma.$transaction([
      this.prisma.permission.findMany({ select: { id: true } }),
      this.prisma.rolePermission.findMany({
        where: { roleId: superAdminRole.id },
        select: { permissionId: true }
      })
    ]);

    const existingPermissionIds = new Set(currentLinks.map((link) => link.permissionId));
    const missingPermissionIds = allPermissions
      .map((permission) => permission.id)
      .filter((permissionId) => !existingPermissionIds.has(permissionId));

    if (missingPermissionIds.length === 0) {
      return { addedCount: 0 };
    }

    try {
      await this.prisma.rolePermission.createMany({
        data: missingPermissionIds.map((permissionId) => ({
          roleId: superAdminRole.id,
          permissionId
        })),
        skipDuplicates: true
      });

      await this.casbinService.reloadRolePolicies(superAdminRole.id);
      return { addedCount: missingPermissionIds.length };
    } catch (error) {
      await this.systemLogsService.write({
        level: SystemLogLevel.ERROR,
        source: SYSTEM_LOG_SOURCES.ROLES,
        message: 'Failed to sync super admin permissions',
        context: { reason, roleCode: 'super_admin' },
        errorStack: error instanceof Error ? error.stack ?? error.message : String(error)
      });
      throw error;
    }
  }
}

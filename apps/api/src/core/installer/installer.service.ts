import { ConflictException, Injectable } from '@nestjs/common';
import {
  OrganizationStatus,
  Prisma,
  RoleType,
  SettingScope,
  SystemLogLevel,
  UserStatus
} from '@prisma/client';
import * as argon2 from 'argon2';
import { CasbinService } from '../../infrastructure/casbin/casbin.service';
import { PrismaService } from '../../infrastructure/prisma/prisma.service';
import { RbacSyncService } from '../rbac-sync/rbac-sync.service';
import { SYSTEM_LOG_EVENTS } from '../system-logs/constants/system-log-events.constants';
import { SYSTEM_LOG_SOURCES } from '../system-logs/constants/system-log-sources.constants';
import { SystemLogsService } from '../system-logs/system-logs.service';
import { InstallerStatusDto } from './dto/installer-status.dto';
import { SetupInstallerDto } from './dto/setup-installer.dto';

const CORE_PERMISSIONS = [
  'users.read',
  'users.create',
  'users.update',
  'users.delete',
  'organizations.read',
  'organizations.create',
  'organizations.update',
  'organizations.delete',
  'roles.read',
  'roles.create',
  'roles.update',
  'roles.delete',
  'permissions.read',
  'settings.read',
  'settings.update',
  'auditLogs.read',
  'systemLogs.read',
  'modules.read',
  'modules.update',
  'installer.read',
  'notifications.read',
  'notifications.manage'
] as const;

const ORG_ADMIN_PERMISSIONS = [
  'users.read',
  'users.create',
  'users.update',
  'roles.read',
  'settings.read',
  'settings.update',
  'auditLogs.read',
  'modules.read'
] as const;

const DEFAULT_INSTALLER_LOCALE = 'ru';

@Injectable()
export class InstallerService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly casbinService: CasbinService,
    private readonly systemLogsService: SystemLogsService,
    private readonly rbacSyncService: RbacSyncService
  ) {}

  async getStatus(): Promise<InstallerStatusDto> {
    const installation = await this.prisma.installation.findFirst({
      where: { installed: true },
      orderBy: { createdAt: 'desc' }
    });

    if (!installation) {
      return { installed: false };
    }

    return {
      installed: true,
      installedAt: installation.installedAt ?? undefined,
      appName: installation.appName ?? undefined,
      version: installation.version ?? undefined
    };
  }

  async setup(dto: SetupInstallerDto) {
    const locale = dto.locale ?? DEFAULT_INSTALLER_LOCALE;
    const isInstalled = await this.prisma.installation.findFirst({ where: { installed: true } });
    if (isInstalled) {
      throw new ConflictException('System is already installed');
    }

    const existingEmail = await this.prisma.user.findUnique({ where: { email: dto.adminEmail } });
    if (existingEmail) {
      throw new ConflictException('Admin email is already in use');
    }

    const existingSlug = await this.prisma.organization.findUnique({
      where: { slug: dto.organizationSlug }
    });
    if (existingSlug) {
      throw new ConflictException('Organization slug is already in use');
    }

    const adminPasswordHash = await argon2.hash(dto.adminPassword);

    try {
      const setupResult = await this.prisma.$transaction(async (tx) => {
        const installationCheck = await tx.installation.findFirst({ where: { installed: true } });
        if (installationCheck) {
          throw new ConflictException('System is already installed');
        }

        const emailCheck = await tx.user.findUnique({ where: { email: dto.adminEmail } });
        if (emailCheck) {
          throw new ConflictException('Admin email is already in use');
        }

        const slugCheck = await tx.organization.findUnique({
          where: { slug: dto.organizationSlug }
        });
        if (slugCheck) {
          throw new ConflictException('Organization slug is already in use');
        }

        const organization = await tx.organization.create({
          data: {
            name: dto.organizationName,
            slug: dto.organizationSlug,
            status: OrganizationStatus.ACTIVE
          }
        });

        const admin = await tx.user.create({
          data: {
            email: dto.adminEmail,
            passwordHash: adminPasswordHash,
            name: dto.adminName,
            status: UserStatus.ACTIVE
          }
        });

        for (const code of CORE_PERMISSIONS) {
          await tx.permission.upsert({
            where: { code },
            create: {
              code,
              module: 'core',
              description: `Core permission: ${code}`
            },
            update: {
              module: 'core',
              description: `Core permission: ${code}`
            }
          });
        }

        const existingSuperAdminRole = await tx.role.findFirst({
          where: { organizationId: null, code: 'super_admin' }
        });
        const superAdminRole = existingSuperAdminRole
          ? await tx.role.update({
              where: { id: existingSuperAdminRole.id },
              data: { name: 'Super Admin', type: RoleType.SYSTEM, organizationId: null }
            })
          : await tx.role.create({
              data: { name: 'Super Admin', code: 'super_admin', type: RoleType.SYSTEM }
            });

        const organizationAdminRole = await tx.role.upsert({
          where: {
            organizationId_code: { organizationId: organization.id, code: 'organization_admin' }
          },
          create: {
            name: 'Organization Admin',
            code: 'organization_admin',
            type: RoleType.ORGANIZATION,
            organizationId: organization.id
          },
          update: { name: 'Organization Admin', type: RoleType.ORGANIZATION }
        });

        await tx.role.upsert({
          where: { organizationId_code: { organizationId: organization.id, code: 'user' } },
          create: {
            name: 'User',
            code: 'user',
            type: RoleType.ORGANIZATION,
            organizationId: organization.id
          },
          update: { name: 'User', type: RoleType.ORGANIZATION }
        });

        const permissions = await tx.permission.findMany({
          where: { code: { in: [...CORE_PERMISSIONS, ...ORG_ADMIN_PERMISSIONS] } }
        });
        const permissionByCode = new Map(permissions.map((p) => [p.code, p.id]));

        await tx.rolePermission.createMany({
          data: CORE_PERMISSIONS.map((code) => ({
            roleId: superAdminRole.id,
            permissionId: permissionByCode.get(code)!
          })),
          skipDuplicates: true
        });

        await tx.rolePermission.createMany({
          data: ORG_ADMIN_PERMISSIONS.map((code) => ({
            roleId: organizationAdminRole.id,
            permissionId: permissionByCode.get(code)!
          })),
          skipDuplicates: true
        });

        await tx.userSystemRole.create({
          data: {
            userId: admin.id,
            roleId: superAdminRole.id
          }
        });

        await tx.userOrganization.create({
          data: {
            userId: admin.id,
            organizationId: organization.id,
            roleId: organizationAdminRole.id,
            status: UserStatus.ACTIVE
          }
        });

        const installationRecord = await tx.installation.findFirst({});
        if (installationRecord) {
          await tx.installation.update({
            where: { id: installationRecord.id },
            data: {
              installed: true,
              appName: dto.appName,
              version: '0.1.0',
              installedAt: new Date()
            }
          });
        } else {
          await tx.installation.create({
            data: {
              installed: true,
              appName: dto.appName,
              version: '0.1.0',
              installedAt: new Date()
            }
          });
        }

        await this.upsertGlobalSetting(tx, 'app.name', dto.appName);
        await this.upsertGlobalSetting(tx, 'app.version', '0.1.0');
        await this.upsertGlobalSetting(tx, 'system.locale', locale);

        return {
          installed: true,
          organization: {
            id: organization.id,
            name: organization.name,
            slug: organization.slug
          },
          admin: {
            id: admin.id,
            email: admin.email,
            name: admin.name
          }
        };
      });

      await this.rbacSyncService.syncSuperAdminPermissions('installer_setup_completed');

      try {
        await this.casbinService.reloadAllPolicies();
      } catch (error) {
        await this.systemLogsService.write({
          level: SystemLogLevel.ERROR,
          source: SYSTEM_LOG_SOURCES.INSTALLER,
          message: 'Installer failed to reload policies',
          context: {
            event: SYSTEM_LOG_EVENTS.INSTALLER_POLICY_RELOAD_FAILED,
            appName: dto.appName,
            organizationSlug: dto.organizationSlug,
            adminEmail: dto.adminEmail
          },
          errorStack: error instanceof Error ? error.stack ?? error.message : String(error)
        });
        throw error;
      }

      return setupResult;
    } catch (error) {
      await this.systemLogsService.write({
        level: SystemLogLevel.ERROR,
        source: SYSTEM_LOG_SOURCES.INSTALLER,
        message: 'Installer setup failed',
        context: {
          event: SYSTEM_LOG_EVENTS.INSTALLER_SETUP_FAILED,
          appName: dto.appName,
          organizationSlug: dto.organizationSlug,
          adminEmail: dto.adminEmail
        },
        errorStack: error instanceof Error ? error.stack ?? error.message : String(error)
      });
      throw error;
    }
  }

  private async upsertGlobalSetting(
    tx: Prisma.TransactionClient,
    key: string,
    value: Prisma.InputJsonValue
  ) {
    const existingSetting = await tx.setting.findFirst({
      where: {
        key,
        scope: SettingScope.GLOBAL,
        organizationId: null,
        moduleCode: null
      },
      select: { id: true }
    });

    if (existingSetting) {
      await tx.setting.update({
        where: { id: existingSetting.id },
        data: { value }
      });
      return;
    }

    await tx.setting.create({
      data: {
        key,
        scope: SettingScope.GLOBAL,
        organizationId: null,
        moduleCode: null,
        value
      }
    });
  }
}

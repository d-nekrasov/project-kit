import { Injectable, OnModuleInit, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { RoleType } from '@prisma/client';
import { Enforcer, newEnforcer } from 'casbin';
import { PrismaService } from '../prisma/prisma.service';
import { parsePermissionCode } from '../../core/permissions/utils/parse-permission-code';

@Injectable()
export class CasbinService implements OnModuleInit {
  private enforcer: Enforcer | null = null;

  constructor(
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService
  ) {}

  async onModuleInit(): Promise<void> {
    const modelPath =
      this.configService.get<string>('CASBIN_MODEL_PATH') || './src/infrastructure/casbin/model.conf';
    this.enforcer = await newEnforcer(modelPath);
    await this.loadPolicies();
  }

  async loadPolicies(): Promise<void> {
    const enforcer = await this.ensureEnforcer();
    await enforcer.clearPolicy();

    const roles = await this.prisma.role.findMany({
      include: {
        permissions: {
          include: {
            permission: true
          }
        }
      }
    });

    for (const role of roles) {
      const roleSubject = `role:${role.code}`;
      for (const rolePermission of role.permissions) {
        const { resource, action } = parsePermissionCode(rolePermission.permission.code);
        const domain = role.type === RoleType.SYSTEM ? '*' : role.organizationId;
        if (!domain) {
          continue;
        }
        await enforcer.addPolicy(roleSubject, domain, resource, action);
      }
    }

    const userSystemRoles = await this.prisma.userSystemRole.findMany({
      include: { role: true }
    });
    for (const userSystemRole of userSystemRoles) {
      await enforcer.addGroupingPolicy(
        userSystemRole.userId,
        `role:${userSystemRole.role.code}`,
        'system'
      );
    }

    const userOrganizations = await this.prisma.userOrganization.findMany({
      include: { role: true }
    });
    for (const membership of userOrganizations) {
      await enforcer.addGroupingPolicy(
        membership.userId,
        `role:${membership.role.code}`,
        membership.organizationId
      );
    }
  }

  async reloadPolicies(): Promise<void> {
    await this.loadPolicies();
  }

  async enforce(
    userId: string,
    organizationId: string,
    resource: string,
    action: string
  ): Promise<boolean> {
    const enforcer = await this.ensureEnforcer();
    return enforcer.enforce(userId, organizationId, resource, action);
  }

  getEnforcer(): Enforcer {
    if (!this.enforcer) {
      throw new Error('Casbin enforcer is not initialized');
    }
    return this.enforcer;
  }

  private async ensureEnforcer(): Promise<Enforcer> {
    if (this.enforcer) {
      return this.enforcer;
    }

    const modelPath =
      this.configService.get<string>('CASBIN_MODEL_PATH') || './src/infrastructure/casbin/model.conf';
    this.enforcer = await newEnforcer(modelPath);
    await this.loadPolicies();
    if (!this.enforcer) {
      throw new ServiceUnavailableException('Casbin enforcer is not initialized');
    }
    return this.enforcer;
  }
}

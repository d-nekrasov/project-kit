import { Injectable, OnModuleInit, ServiceUnavailableException } from '@nestjs/common';
import { RoleType, UserStatus } from '@prisma/client';
import { Enforcer, newEnforcer } from 'casbin';
import { parsePermissionCode } from '../../core/permissions/utils/parse-permission-code';
import { PrismaService } from '../prisma/prisma.service';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class CasbinService implements OnModuleInit {
  private enforcer: Enforcer | null = null;
  private isReady = false;
  private rolePolicyKeys = new Map<string, string[]>();
  private userOrganizationGroupingKeys = new Map<string, string[]>();
  private userSystemGroupingKeys = new Map<string, string[]>();
  private policyUpdateQueue: Promise<void> = Promise.resolve();

  constructor(
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService
  ) {}

  async onModuleInit(): Promise<void> {
    await this.initializeEnforcer();
    await this.reloadAllPolicies();
  }

  async loadPolicies(): Promise<void> {
    await this.reloadAllPolicies();
  }

  async reloadPolicies(): Promise<void> {
    await this.reloadAllPolicies();
  }

  async reloadAllPolicies(): Promise<void> {
    await this.enqueuePolicyUpdate(async () => {
      const enforcer = await this.ensureEnforcer();
      this.isReady = false;
      await enforcer.clearPolicy();
      this.rolePolicyKeys.clear();
      this.userOrganizationGroupingKeys.clear();
      this.userSystemGroupingKeys.clear();

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
        const domain = role.type === RoleType.SYSTEM ? '*' : role.organizationId;
        if (!domain) {
          continue;
        }

        for (const rolePermission of role.permissions) {
          const { resource, action } = parsePermissionCode(rolePermission.permission.code);
          await this.addPolicyTracked(role.id, role.code, domain, resource, action);
        }
      }

      const userSystemRoles = await this.prisma.userSystemRole.findMany({
        include: { role: true }
      });
      for (const userSystemRole of userSystemRoles) {
        if (userSystemRole.role.type !== RoleType.SYSTEM) {
          continue;
        }

        await this.addGroupingTracked(
          userSystemRole.userId,
          userSystemRole.userId,
          userSystemRole.role.code,
          'system',
          'system'
        );
      }

      const userOrganizations = await this.prisma.userOrganization.findMany({
        where: { status: UserStatus.ACTIVE },
        include: { role: true }
      });
      for (const membership of userOrganizations) {
        if (membership.role.type !== RoleType.ORGANIZATION) {
          continue;
        }

        await this.addGroupingTracked(
          this.makeUserOrganizationCacheKey(membership.userId, membership.organizationId),
          membership.userId,
          membership.role.code,
          membership.organizationId,
          'organization'
        );
      }

      this.isReady = true;
    });
  }

  async reloadRolePolicies(roleId: string): Promise<void> {
    await this.enqueuePolicyUpdate(async () => {
      await this.ensureEnforcer();
      await this.removeTrackedRolePolicies(roleId);

      const role = await this.prisma.role.findUnique({
        where: { id: roleId },
        include: {
          permissions: {
            include: {
              permission: true
            }
          }
        }
      });

      if (!role) {
        return;
      }

      const domain = role.type === RoleType.SYSTEM ? '*' : role.organizationId;
      if (!domain) {
        return;
      }

      for (const rolePermission of role.permissions) {
        const { resource, action } = parsePermissionCode(rolePermission.permission.code);
        await this.addPolicyTracked(role.id, role.code, domain, resource, action);
      }
    });
  }

  async reloadUserOrganizationRole(userId: string, organizationId: string): Promise<void> {
    await this.enqueuePolicyUpdate(async () => {
      await this.ensureEnforcer();

      const cacheKey = this.makeUserOrganizationCacheKey(userId, organizationId);
      await this.removeTrackedGrouping(cacheKey, 'organization');

      const membership = await this.prisma.userOrganization.findUnique({
        where: {
          userId_organizationId: {
            userId,
            organizationId
          }
        },
        include: { role: true }
      });

      if (!membership || membership.status !== UserStatus.ACTIVE) {
        return;
      }

      if (membership.role.type !== RoleType.ORGANIZATION) {
        return;
      }

      await this.addGroupingTracked(
        cacheKey,
        userId,
        membership.role.code,
        organizationId,
        'organization'
      );
    });
  }

  async reloadUserSystemRoles(userId: string): Promise<void> {
    await this.enqueuePolicyUpdate(async () => {
      await this.ensureEnforcer();
      await this.removeTrackedGrouping(userId, 'system');

      const systemRoles = await this.prisma.userSystemRole.findMany({
        where: { userId },
        include: { role: true }
      });

      for (const systemRole of systemRoles) {
        if (systemRole.role.type !== RoleType.SYSTEM) {
          continue;
        }

        await this.addGroupingTracked(userId, userId, systemRole.role.code, 'system', 'system');
      }
    });
  }

  async enforce(
    userId: string,
    organizationId: string,
    resource: string,
    action: string
  ): Promise<boolean> {
    const enforcer = await this.ensureReady();
    return enforcer.enforce(userId, organizationId, resource, action);
  }

  getEnforcer(): Enforcer {
    if (!this.enforcer) {
      throw new Error('Casbin enforcer is not initialized');
    }
    return this.enforcer;
  }

  getStats(): {
    ready: boolean;
    rolePolicyCacheSize: number;
    userOrganizationGroupingCacheSize: number;
    userSystemGroupingCacheSize: number;
  } {
    return {
      ready: this.isReady,
      rolePolicyCacheSize: this.rolePolicyKeys.size,
      userOrganizationGroupingCacheSize: this.userOrganizationGroupingKeys.size,
      userSystemGroupingCacheSize: this.userSystemGroupingKeys.size
    };
  }

  private async initializeEnforcer(): Promise<void> {
    if (this.enforcer) {
      return;
    }

    const modelPath =
      this.configService.get<string>('CASBIN_MODEL_PATH') || './src/infrastructure/casbin/model.conf';
    this.enforcer = await newEnforcer(modelPath);
  }

  private async ensureEnforcer(): Promise<Enforcer> {
    if (!this.enforcer) {
      await this.initializeEnforcer();
    }

    if (!this.enforcer) {
      throw new ServiceUnavailableException('Casbin enforcer is not initialized');
    }

    return this.enforcer;
  }

  private async ensureReady(): Promise<Enforcer> {
    const enforcer = await this.ensureEnforcer();

    await this.policyUpdateQueue;

    if (!this.isReady) {
      await this.reloadAllPolicies();
      await this.policyUpdateQueue;
    }

    if (!this.isReady) {
      throw new ServiceUnavailableException('Casbin policies are not ready');
    }

    return enforcer;
  }

  private async enqueuePolicyUpdate<T>(operation: () => Promise<T>): Promise<T> {
    const run = this.policyUpdateQueue.then(operation, operation);
    this.policyUpdateQueue = run.then(
      () => undefined,
      () => undefined
    );
    return run;
  }

  private makePolicyKey(roleCode: string, domain: string, resource: string, action: string): string {
    return `p::role:${roleCode}::${domain}::${resource}::${action}`;
  }

  private makeGroupingKey(userId: string, roleCode: string, domain: string): string {
    return `g::${userId}::role:${roleCode}::${domain}`;
  }

  private parsePolicyKey(key: string): [roleKey: string, domain: string, resource: string, action: string] {
    const [prefix, roleKey, domain, resource, action] = key.split('::');
    if (prefix !== 'p' || !roleKey || !domain || !resource || !action) {
      throw new Error(`Invalid policy key: ${key}`);
    }
    return [roleKey, domain, resource, action];
  }

  private parseGroupingKey(key: string): [userId: string, roleKey: string, domain: string] {
    const [prefix, userId, roleKey, domain] = key.split('::');
    if (prefix !== 'g' || !userId || !roleKey || !domain) {
      throw new Error(`Invalid grouping key: ${key}`);
    }
    return [userId, roleKey, domain];
  }

  private makeUserOrganizationCacheKey(userId: string, organizationId: string): string {
    return `${userId}:${organizationId}`;
  }

  private async addPolicyTracked(
    roleId: string,
    roleCode: string,
    domain: string,
    resource: string,
    action: string
  ): Promise<void> {
    const enforcer = await this.ensureEnforcer();
    const rolePolicies = this.rolePolicyKeys.get(roleId) ?? [];
    const key = this.makePolicyKey(roleCode, domain, resource, action);

    if (rolePolicies.includes(key)) {
      return;
    }

    await enforcer.addPolicy(`role:${roleCode}`, domain, resource, action);
    rolePolicies.push(key);
    this.rolePolicyKeys.set(roleId, rolePolicies);
  }

  private async removeTrackedRolePolicies(roleId: string): Promise<void> {
    const enforcer = await this.ensureEnforcer();
    const keys = this.rolePolicyKeys.get(roleId);

    if (!keys || keys.length === 0) {
      this.rolePolicyKeys.delete(roleId);
      return;
    }

    for (const key of keys) {
      const [roleKey, domain, resource, action] = this.parsePolicyKey(key);
      await enforcer.removePolicy(roleKey, domain, resource, action);
    }

    this.rolePolicyKeys.delete(roleId);
  }

  private async addGroupingTracked(
    cacheKey: string,
    userId: string,
    roleCode: string,
    domain: string,
    target: 'organization' | 'system'
  ): Promise<void> {
    const enforcer = await this.ensureEnforcer();
    const map =
      target === 'organization' ? this.userOrganizationGroupingKeys : this.userSystemGroupingKeys;

    const groupingKeys = map.get(cacheKey) ?? [];
    const key = this.makeGroupingKey(userId, roleCode, domain);

    if (groupingKeys.includes(key)) {
      return;
    }

    await enforcer.addGroupingPolicy(userId, `role:${roleCode}`, domain);
    groupingKeys.push(key);
    map.set(cacheKey, groupingKeys);
  }

  private async removeTrackedGrouping(
    cacheKey: string,
    target: 'organization' | 'system'
  ): Promise<void> {
    const enforcer = await this.ensureEnforcer();
    const map =
      target === 'organization' ? this.userOrganizationGroupingKeys : this.userSystemGroupingKeys;

    const keys = map.get(cacheKey);
    if (!keys || keys.length === 0) {
      map.delete(cacheKey);
      return;
    }

    for (const key of keys) {
      const [userId, roleKey, domain] = this.parseGroupingKey(key);
      await enforcer.removeGroupingPolicy(userId, roleKey, domain);
    }

    map.delete(cacheKey);
  }
}

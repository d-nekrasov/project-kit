import {
  BadRequestException,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  InternalServerErrorException,
  UnauthorizedException
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { CasbinService } from '../../../infrastructure/casbin/casbin.service';
import { CurrentOrganization } from '../../organization-context/types/current-organization.type';
import { CurrentUser } from '../../auth/types/current-user.type';
import { PERMISSIONS_KEY } from '../decorators/permissions.decorator';
import { parsePermissionCode } from '../utils/parse-permission-code';

@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly casbinService: CasbinService
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const permissions =
      this.reflector.getAllAndOverride<string[]>(PERMISSIONS_KEY, [
        context.getHandler(),
        context.getClass()
      ]) ?? [];

    if (permissions.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest<{
      user?: CurrentUser;
      organization?: CurrentOrganization;
    }>();
    const user = request.user;
    const organization = request.organization;

    if (!user) {
      throw new UnauthorizedException();
    }
    if (!organization) {
      throw new BadRequestException('Organization context is required');
    }

    for (const permissionCode of permissions) {
      let parsed: { resource: string; action: string };
      try {
        parsed = parsePermissionCode(permissionCode);
      } catch {
        throw new InternalServerErrorException('Invalid permission metadata format');
      }

      const allowed = await this.casbinService.enforce(
        user.id,
        organization.id,
        parsed.resource,
        parsed.action
      );

      if (!allowed) {
        throw new ForbiddenException('You do not have permission to perform this action');
      }
    }

    return true;
  }
}

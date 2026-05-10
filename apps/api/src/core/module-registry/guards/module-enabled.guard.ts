import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  ServiceUnavailableException
} from '@nestjs/common';
import { ModuleStatus } from '@prisma/client';
import { Reflector } from '@nestjs/core';
import { MODULE_KEY } from '../decorators/module-key.decorator';
import { ModuleRegistryService } from '../module-registry.service';

@Injectable()
export class ModuleEnabledGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly moduleRegistryService: ModuleRegistryService
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const moduleKey = this.reflector.getAllAndOverride<string>(MODULE_KEY, [
      context.getHandler(),
      context.getClass()
    ]);

    if (!moduleKey || moduleKey === 'core') {
      return true;
    }

    try {
      const status = await this.moduleRegistryService.getModuleStatus(moduleKey);
      if (status === null) {
        throw new ForbiddenException('Module is not available');
      }
      if (status === ModuleStatus.DISABLED) {
        throw new ForbiddenException('Module is disabled');
      }
      return true;
    } catch (error) {
      if (error instanceof ForbiddenException) {
        throw error;
      }
      throw new ServiceUnavailableException('Module is not available');
    }
  }
}

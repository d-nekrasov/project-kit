import { Module } from '@nestjs/common';
import { CasbinModule } from '../../infrastructure/casbin/casbin.module';
import { PrismaModule } from '../../infrastructure/prisma/prisma.module';
import { AuditLogsModule } from '../audit-logs/audit-logs.module';
import { PermissionsModule } from '../permissions/permissions.module';
import { SystemLogsModule } from '../system-logs/system-logs.module';
import { ModuleRegistryController } from './module-registry.controller';
import { ModuleRegistryService } from './module-registry.service';

@Module({
  imports: [PrismaModule, CasbinModule, PermissionsModule, AuditLogsModule, SystemLogsModule],
  controllers: [ModuleRegistryController],
  providers: [ModuleRegistryService],
  exports: [ModuleRegistryService]
})
export class ModuleRegistryModule {}

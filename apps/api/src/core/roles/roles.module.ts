import { Module } from '@nestjs/common';
import { CasbinModule } from '../../infrastructure/casbin/casbin.module';
import { AuditLogsModule } from '../audit-logs/audit-logs.module';
import { CurrentUserCacheModule } from '../auth/current-user-cache.module';
import { PermissionsModule } from '../permissions/permissions.module';
import { RolesController } from './roles.controller';
import { RolesService } from './roles.service';

@Module({
  imports: [CasbinModule, CurrentUserCacheModule, PermissionsModule, AuditLogsModule],
  controllers: [RolesController],
  providers: [RolesService]
})
export class RolesModule {}

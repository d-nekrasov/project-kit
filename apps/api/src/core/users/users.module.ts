import { Module } from '@nestjs/common';
import { CasbinModule } from '../../infrastructure/casbin/casbin.module';
import { AuditLogsModule } from '../audit-logs/audit-logs.module';
import { CurrentUserCacheModule } from '../auth/current-user-cache.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { PermissionsModule } from '../permissions/permissions.module';
import { SystemLogsModule } from '../system-logs/system-logs.module';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';

@Module({
  imports: [
    CasbinModule,
    CurrentUserCacheModule,
    PermissionsModule,
    AuditLogsModule,
    NotificationsModule,
    SystemLogsModule
  ],
  controllers: [UsersController],
  providers: [UsersService]
})
export class UsersModule {}

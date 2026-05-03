import { Module } from '@nestjs/common';
import { CasbinModule } from '../../infrastructure/casbin/casbin.module';
import { AuditLogsModule } from '../audit-logs/audit-logs.module';
import { PermissionsModule } from '../permissions/permissions.module';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';

@Module({
  imports: [CasbinModule, PermissionsModule, AuditLogsModule],
  controllers: [UsersController],
  providers: [UsersService]
})
export class UsersModule {}

import { Module } from '@nestjs/common';
import { CasbinModule } from '../../infrastructure/casbin/casbin.module';
import { PermissionsGuard } from './guards/permissions.guard';

@Module({
  imports: [CasbinModule],
  providers: [PermissionsGuard],
  exports: [PermissionsGuard]
})
export class PermissionsModule {}

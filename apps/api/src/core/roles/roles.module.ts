import { Module } from '@nestjs/common';
import { CasbinModule } from '../../infrastructure/casbin/casbin.module';
import { PermissionsModule } from '../permissions/permissions.module';
import { RolesController } from './roles.controller';
import { RolesService } from './roles.service';

@Module({
  imports: [CasbinModule, PermissionsModule],
  controllers: [RolesController],
  providers: [RolesService]
})
export class RolesModule {}

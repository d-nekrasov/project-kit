import { Module } from '@nestjs/common';
import { CasbinModule } from '../../infrastructure/casbin/casbin.module';
import { PermissionsModule } from '../permissions/permissions.module';
import { OrganizationsController } from './organizations.controller';
import { OrganizationsService } from './organizations.service';

@Module({
  imports: [CasbinModule, PermissionsModule],
  controllers: [OrganizationsController],
  providers: [OrganizationsService]
})
export class OrganizationsModule {}

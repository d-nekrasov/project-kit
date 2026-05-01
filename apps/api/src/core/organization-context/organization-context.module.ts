import { Module } from '@nestjs/common';
import { OrganizationGuard } from './guards/organization.guard';

@Module({
  providers: [OrganizationGuard],
  exports: [OrganizationGuard]
})
export class OrganizationContextModule {}

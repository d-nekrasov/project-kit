import { Module } from '@nestjs/common';
import { PrismaModule } from '../../infrastructure/prisma/prisma.module';
import { OrganizationGuard } from './guards/organization.guard';

@Module({
  imports: [PrismaModule],
  providers: [OrganizationGuard],
  exports: [OrganizationGuard]
})
export class OrganizationContextModule {}

import { Module, OnModuleInit } from '@nestjs/common';
import { AuditLogsModule } from '../../core/audit-logs/audit-logs.module';
import { ModuleRegistryModule } from '../../core/module-registry/module-registry.module';
import { ModuleRegistryService } from '../../core/module-registry/module-registry.service';
import { OrganizationContextModule } from '../../core/organization-context/organization-context.module';
import { PermissionsModule } from '../../core/permissions/permissions.module';
import { CasbinModule } from '../../infrastructure/casbin/casbin.module';
import { PrismaModule } from '../../infrastructure/prisma/prisma.module';
import { DocumentsController } from './documents.controller';
import { DOCUMENTS_MODULE_MANIFEST } from './documents.manifest';
import { DocumentsService } from './documents.service';

@Module({
  imports: [
    PrismaModule,
    CasbinModule,
    PermissionsModule,
    OrganizationContextModule,
    ModuleRegistryModule,
    AuditLogsModule
  ],
  controllers: [DocumentsController],
  providers: [DocumentsService]
})
export class DocumentsModule implements OnModuleInit {
  constructor(private readonly moduleRegistryService: ModuleRegistryService) {}

  async onModuleInit(): Promise<void> {
    await this.moduleRegistryService.registerModules([DOCUMENTS_MODULE_MANIFEST]);
  }
}

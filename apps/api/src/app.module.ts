import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from './infrastructure/prisma/prisma.module';
import { LoggerModule } from './infrastructure/logger/logger.module';
import { CasbinModule } from './infrastructure/casbin/casbin.module';
import { AuthModule } from './core/auth/auth.module';
import { UsersModule } from './core/users/users.module';
import { OrganizationsModule } from './core/organizations/organizations.module';
import { RolesModule } from './core/roles/roles.module';
import { PermissionsModule } from './core/permissions/permissions.module';
import { SettingsModule } from './core/settings/settings.module';
import { AuditLogsModule } from './core/audit-logs/audit-logs.module';
import { SystemLogsModule } from './core/system-logs/system-logs.module';
import { ModuleRegistryModule } from './core/module-registry/module-registry.module';
import { InstallerModule } from './core/installer/installer.module';
import { DocumentsModule } from './modules/documents/documents.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, envFilePath: ['.env', '.env.local'] }),
    PrismaModule,
    LoggerModule,
    CasbinModule,
    AuthModule,
    UsersModule,
    OrganizationsModule,
    RolesModule,
    PermissionsModule,
    SettingsModule,
    AuditLogsModule,
    SystemLogsModule,
    ModuleRegistryModule,
    InstallerModule,
    DocumentsModule
  ]
})
export class AppModule {}

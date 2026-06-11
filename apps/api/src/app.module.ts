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
import { I18nModule } from './core/i18n/i18n.module';
import { DocumentsModule } from './modules/documents/documents.module';
import { OrganizationContextModule } from './core/organization-context/organization-context.module';
import { NotificationsModule } from './core/notifications/notifications.module';
import { DataRetentionModule } from './core/data-retention/data-retention.module';
import { RedisModule } from './infrastructure/redis/redis.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, envFilePath: ['.env', '.env.local'] }),
    RedisModule,
    PrismaModule,
    LoggerModule,
    CasbinModule,
    AuthModule,
    UsersModule,
    OrganizationsModule,
    RolesModule,
    PermissionsModule,
    SettingsModule,
    I18nModule,
    AuditLogsModule,
    SystemLogsModule,
    ModuleRegistryModule,
    InstallerModule,
    NotificationsModule,
    DataRetentionModule,
    DocumentsModule,
    OrganizationContextModule
  ]
})
export class AppModule {}

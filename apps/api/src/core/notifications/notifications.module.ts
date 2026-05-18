import { Module } from '@nestjs/common';
import { CasbinModule } from '../../infrastructure/casbin/casbin.module';
import { PrismaModule } from '../../infrastructure/prisma/prisma.module';
import { AuditLogsModule } from '../audit-logs/audit-logs.module';
import { OrganizationContextModule } from '../organization-context/organization-context.module';
import { PermissionsModule } from '../permissions/permissions.module';
import { SystemLogsModule } from '../system-logs/system-logs.module';
import { EmailSmtpNotificationConnector } from './connectors/email-smtp-notification.connector';
import { InAppNotificationConnector } from './connectors/in-app-notification.connector';
import { NotificationConnectorsController } from './notification-connectors.controller';
import { NotificationConnectorsService } from './notification-connectors.service';
import { NotificationTemplatesController } from './notification-templates.controller';
import { NotificationTemplatesService } from './notification-templates.service';
import { NotificationsController } from './notifications.controller';
import { NotificationsService } from './notifications.service';

@Module({
  imports: [PrismaModule, CasbinModule, SystemLogsModule, AuditLogsModule, OrganizationContextModule, PermissionsModule],
  controllers: [NotificationsController, NotificationConnectorsController, NotificationTemplatesController],
  providers: [
    NotificationsService,
    NotificationConnectorsService,
    NotificationTemplatesService,
    InAppNotificationConnector,
    EmailSmtpNotificationConnector
  ],
  exports: [NotificationsService]
})
export class NotificationsModule {}

import { Injectable, NotFoundException, OnModuleInit } from '@nestjs/common';
import {
  NotificationChannel,
  NotificationDeliveryStatus,
  NotificationStatus,
  Prisma,
  SystemLogLevel
} from '@prisma/client';
import { PrismaService } from '../../infrastructure/prisma/prisma.service';
import { CurrentUser } from '../auth/types/current-user.type';
import { SYSTEM_LOG_EVENTS } from '../system-logs/constants/system-log-events.constants';
import { SYSTEM_LOG_SOURCES } from '../system-logs/constants/system-log-sources.constants';
import { SystemLogsService } from '../system-logs/system-logs.service';
import { EmailSmtpNotificationConnector } from './connectors/email-smtp-notification.connector';
import { InAppNotificationConnector } from './connectors/in-app-notification.connector';
import {
  DEFAULT_NOTIFICATION_CONNECTORS,
  DEFAULT_NOTIFICATION_TEMPLATES,
  NOTIFICATION_CONNECTOR_CODES
} from './constants/notification-events.constants';
import { MyNotificationsQueryDto } from './dto/my-notifications-query.dto';
import { NotificationResponseDto } from './dto/notification-response.dto';
import { NotifyDto } from './types/notification.types';
import { renderNotificationTemplate } from './utils/render-notification-template';

const NOTIFICATION_INCLUDE = {
  deliveries: { orderBy: { createdAt: 'asc' } }
} satisfies Prisma.NotificationInclude;

@Injectable()
export class NotificationsService implements OnModuleInit {
  constructor(
    private readonly prisma: PrismaService,
    private readonly systemLogsService: SystemLogsService,
    private readonly inAppConnector: InAppNotificationConnector,
    private readonly emailConnector: EmailSmtpNotificationConnector
  ) {}

  async onModuleInit(): Promise<void> {
    await this.seedDefaults();
  }

  async notify(dto: NotifyDto): Promise<void> {
    const recipientUserIds = [...new Set(dto.recipientUserIds.filter(Boolean))];
    if (recipientUserIds.length === 0) {
      return;
    }

    const payload = dto.payload ?? {};
    const template = await this.prisma.notificationTemplate.findUnique({
      where: { event: dto.event }
    });
    const channels = this.resolveChannels(dto.channels, template?.channels);
    const rendered = this.renderContent(dto, template, payload);

    const [users, emailConnector] = await this.prisma.$transaction([
      this.prisma.user.findMany({
        where: { id: { in: recipientUserIds } },
        select: { id: true, email: true }
      }),
      this.prisma.notificationConnector.findUnique({
        where: { code: NOTIFICATION_CONNECTOR_CODES.SMTP_EMAIL }
      })
    ]);
    const userById = new Map(users.map((user) => [user.id, user]));

    for (const recipientUserId of recipientUserIds) {
      const user = userById.get(recipientUserId);
      if (!user) {
        continue;
      }

      const notification = await this.prisma.notification.create({
        data: {
          organizationId: dto.organizationId ?? null,
          recipientUserId,
          event: dto.event,
          title: rendered.title,
          message: rendered.message,
          payload: payload as Prisma.InputJsonValue
        }
      });

      if (channels.includes(NotificationChannel.IN_APP)) {
        await this.inAppConnector.send({ channel: NotificationChannel.IN_APP });
        await this.prisma.notificationDelivery.create({
          data: {
            notificationId: notification.id,
            channel: NotificationChannel.IN_APP,
            status: NotificationDeliveryStatus.SENT,
            connectorCode: NOTIFICATION_CONNECTOR_CODES.IN_APP,
            sentAt: new Date()
          }
        });
      }

      if (channels.includes(NotificationChannel.EMAIL)) {
        await this.deliverEmail(notification.id, user.email, rendered.emailSubject, rendered.emailBody, emailConnector);
      }
    }
  }

  async findMy(
    query: MyNotificationsQueryDto,
    currentUser: CurrentUser
  ): Promise<{ items: NotificationResponseDto[]; meta: { page: number; limit: number; total: number; totalPages: number } }> {
    const page = query.page ?? 1;
    const limit = Math.min(query.limit ?? 20, 100);
    const skip = (page - 1) * limit;

    const where: Prisma.NotificationWhereInput = {
      recipientUserId: currentUser.id,
      ...(query.status ? { status: query.status } : {}),
      ...(query.event ? { event: query.event } : {})
    };

    const [items, total] = await this.prisma.$transaction([
      this.prisma.notification.findMany({
        where,
        include: NOTIFICATION_INCLUDE,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit
      }),
      this.prisma.notification.count({ where })
    ]);

    return {
      items: items.map((item) => this.toResponse(item)),
      meta: { page, limit, total, totalPages: Math.ceil(total / limit) || 1 }
    };
  }

  async unreadCount(currentUser: CurrentUser): Promise<{ count: number }> {
    const count = await this.prisma.notification.count({
      where: { recipientUserId: currentUser.id, status: NotificationStatus.UNREAD }
    });
    return { count };
  }

  async markRead(id: string, currentUser: CurrentUser): Promise<NotificationResponseDto> {
    const notification = await this.prisma.notification.findFirst({
      where: { id, recipientUserId: currentUser.id },
      include: NOTIFICATION_INCLUDE
    });
    if (!notification) {
      throw new NotFoundException('Notification not found');
    }
    if (notification.status === NotificationStatus.READ) {
      return this.toResponse(notification);
    }

    const updated = await this.prisma.notification.update({
      where: { id: notification.id },
      data: { status: NotificationStatus.READ, readAt: new Date() },
      include: NOTIFICATION_INCLUDE
    });
    return this.toResponse(updated);
  }

  async markAllRead(currentUser: CurrentUser): Promise<{ updated: number }> {
    const result = await this.prisma.notification.updateMany({
      where: { recipientUserId: currentUser.id, status: NotificationStatus.UNREAD },
      data: { status: NotificationStatus.READ, readAt: new Date() }
    });
    return { updated: result.count };
  }

  private async seedDefaults(): Promise<void> {
    for (const connector of DEFAULT_NOTIFICATION_CONNECTORS) {
      await this.prisma.notificationConnector.upsert({
        where: { code: connector.code },
        create: {
          code: connector.code,
          channel: connector.channel,
          status: connector.status,
          config: connector.config as Prisma.InputJsonValue
        },
        update: {}
      });
    }

    for (const template of DEFAULT_NOTIFICATION_TEMPLATES) {
      await this.prisma.notificationTemplate.upsert({
        where: { event: template.event },
        create: {
          event: template.event,
          title: template.title,
          message: template.message,
          emailSubject: template.emailSubject,
          emailBody: template.emailBody,
          channels: [...template.channels] as Prisma.InputJsonValue
        },
        update: {}
      });
    }
  }

  private resolveChannels(dtoChannels: NotificationChannel[] | undefined, templateChannels: Prisma.JsonValue | undefined): NotificationChannel[] {
    if (dtoChannels?.length) {
      return [...new Set(dtoChannels)];
    }
    if (Array.isArray(templateChannels)) {
      const channels = templateChannels.filter((item): item is NotificationChannel => this.isNotificationChannel(item));
      if (channels.length > 0) {
        return [...new Set(channels)];
      }
    }
    return [NotificationChannel.IN_APP];
  }

  private renderContent(dto: NotifyDto, template: { title: string; message: string; emailSubject: string | null; emailBody: string | null } | null, payload: Record<string, unknown>) {
    try {
      const titleTemplate = template?.title ?? dto.title ?? dto.event;
      const messageTemplate = template?.message ?? dto.message ?? dto.event;
      const emailSubjectTemplate = template?.emailSubject ?? titleTemplate;
      const emailBodyTemplate = template?.emailBody ?? messageTemplate;
      return {
        title: renderNotificationTemplate(titleTemplate, payload),
        message: renderNotificationTemplate(messageTemplate, payload),
        emailSubject: renderNotificationTemplate(emailSubjectTemplate, payload),
        emailBody: renderNotificationTemplate(emailBodyTemplate, payload)
      };
    } catch (error) {
      void this.systemLogsService.write({
        level: SystemLogLevel.ERROR,
        source: SYSTEM_LOG_SOURCES.NOTIFICATIONS,
        message: 'Failed to render notification template',
        context: { event: SYSTEM_LOG_EVENTS.NOTIFICATION_TEMPLATE_RENDER_FAILED, notificationEvent: dto.event },
        errorStack: error instanceof Error ? error.stack ?? error.message : String(error),
        organizationId: dto.organizationId ?? null
      });
      return {
        title: dto.title ?? dto.event,
        message: dto.message ?? dto.event,
        emailSubject: dto.title ?? dto.event,
        emailBody: dto.message ?? dto.event
      };
    }
  }

  private async deliverEmail(
    notificationId: string,
    email: string | null,
    subject: string,
    body: string,
    connector: { code: string; status: string; config: Prisma.JsonValue } | null
  ): Promise<void> {
    const delivery = await this.prisma.notificationDelivery.create({
      data: {
        notificationId,
        channel: NotificationChannel.EMAIL,
        status: NotificationDeliveryStatus.PENDING,
        connectorCode: NOTIFICATION_CONNECTOR_CODES.SMTP_EMAIL
      }
    });

    if (!connector || connector.status !== 'ENABLED') {
      await this.prisma.notificationDelivery.update({
        where: { id: delivery.id },
        data: { status: NotificationDeliveryStatus.SKIPPED, error: 'SMTP connector is disabled' }
      });
      return;
    }
    if (!email) {
      await this.prisma.notificationDelivery.update({
        where: { id: delivery.id },
        data: { status: NotificationDeliveryStatus.SKIPPED, error: 'Recipient email is missing' }
      });
      return;
    }

    try {
      const result = await this.emailConnector.send({
        channel: NotificationChannel.EMAIL,
        to: email,
        subject,
        body,
        config: connector.config as Record<string, unknown> | null
      });
      if (!result.ok) {
        await this.markEmailFailed(delivery.id, result.error ?? 'SMTP delivery failed', notificationId);
        return;
      }
      await this.prisma.notificationDelivery.update({
        where: { id: delivery.id },
        data: { status: NotificationDeliveryStatus.SENT, sentAt: new Date(), error: null }
      });
    } catch (error) {
      await this.markEmailFailed(delivery.id, error instanceof Error ? error.message : String(error), notificationId, error);
    }
  }

  private async markEmailFailed(deliveryId: string, errorMessage: string, notificationId: string, rawError?: unknown): Promise<void> {
    await this.prisma.notificationDelivery.update({
      where: { id: deliveryId },
      data: { status: NotificationDeliveryStatus.FAILED, error: errorMessage }
    });
    await this.systemLogsService.write({
      level: SystemLogLevel.ERROR,
      source: SYSTEM_LOG_SOURCES.NOTIFICATIONS,
      message: 'Notification email delivery failed',
      context: {
        event: SYSTEM_LOG_EVENTS.NOTIFICATION_DELIVERY_FAILED,
        notificationId,
        channel: NotificationChannel.EMAIL,
        connectorCode: NOTIFICATION_CONNECTOR_CODES.SMTP_EMAIL,
        error: errorMessage
      },
      errorStack: rawError instanceof Error ? rawError.stack ?? rawError.message : undefined
    });
  }

  private isNotificationChannel(value: unknown): value is NotificationChannel {
    return typeof value === 'string' && Object.values(NotificationChannel).includes(value as NotificationChannel);
  }

  private toResponse(item: Prisma.NotificationGetPayload<{ include: typeof NOTIFICATION_INCLUDE }>): NotificationResponseDto {
    return {
      id: item.id,
      organizationId: item.organizationId,
      recipientUserId: item.recipientUserId,
      event: item.event,
      title: item.title,
      message: item.message,
      payload: (item.payload as Record<string, unknown> | null) ?? null,
      status: item.status,
      readAt: item.readAt,
      createdAt: item.createdAt,
      updatedAt: item.updatedAt,
      deliveries: item.deliveries.map((delivery) => ({
        id: delivery.id,
        channel: delivery.channel,
        status: delivery.status,
        connectorCode: delivery.connectorCode,
        error: delivery.error,
        sentAt: delivery.sentAt,
        createdAt: delivery.createdAt,
        updatedAt: delivery.updatedAt
      }))
    };
  }
}

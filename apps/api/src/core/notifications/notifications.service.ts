import { Injectable, NotFoundException, OnModuleInit, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import {
  NotificationChannel,
  NotificationConnectorStatus,
  NotificationDeliveryStatus,
  NotificationStatus,
  Prisma,
  SystemLogLevel,
  UserStatus
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
  getAllowedNotificationChannelsForEvent,
  NOTIFICATION_CONNECTOR_CODES
} from './constants/notification-events.constants';
import { MyNotificationsQueryDto } from './dto/my-notifications-query.dto';
import { NotificationStreamTokenResponseDto } from './dto/notification-stream-token-response.dto';
import { NotificationResponseDto } from './dto/notification-response.dto';
import { NotificationsRealtimeService } from './notifications-realtime.service';
import { NotifyDto } from './types/notification.types';
import { NotificationStreamTokenPayload } from './types/notification-realtime.types';
import { renderNotificationTemplate } from './utils/render-notification-template';

const NOTIFICATION_INCLUDE = {
  deliveries: { orderBy: { createdAt: 'asc' } }
} satisfies Prisma.NotificationInclude;

type RenderedNotificationContent = {
  title: string;
  message: string;
  emailSubject: string;
  emailBody: string;
};

type CreatedNotification = {
  id: string;
  organizationId: string | null;
  event: string;
  title: string;
  message: string;
  status: NotificationStatus;
  createdAt: Date;
};

const NOTIFICATION_STREAM_TOKEN_TTL_SECONDS = 60;

@Injectable()
export class NotificationsService implements OnModuleInit {
  constructor(
    private readonly prisma: PrismaService,
    private readonly systemLogsService: SystemLogsService,
    private readonly inAppConnector: InAppNotificationConnector,
    private readonly emailConnector: EmailSmtpNotificationConnector,
    private readonly jwtService: JwtService,
    private readonly notificationsRealtimeService: NotificationsRealtimeService
  ) {}

  async onModuleInit(): Promise<void> {
    await this.seedDefaults();
  }

  async notify(dto: NotifyDto): Promise<void> {
    const recipientUserIds = [...new Set(dto.recipientUserIds.filter(Boolean))];
    if (recipientUserIds.length === 0) {
      await this.writeNotificationLog({
        level: SystemLogLevel.WARN,
        message: 'Notification skipped because no recipients were provided',
        event: SYSTEM_LOG_EVENTS.NOTIFICATION_NO_RECIPIENTS,
        notificationEvent: dto.event,
        organizationId: dto.organizationId ?? null
      });
      return;
    }

    const payload = dto.payload ?? {};
    const template = await this.prisma.notificationTemplate.findUnique({
      where: { event: dto.event }
    });
    if (!template) {
      await this.writeNotificationLog({
        level: SystemLogLevel.WARN,
        message: 'Notification template not found; using request fallback content',
        event: SYSTEM_LOG_EVENTS.NOTIFICATION_TEMPLATE_NOT_FOUND,
        notificationEvent: dto.event,
        organizationId: dto.organizationId ?? null
      });
    }
    const channels = this.resolveChannels(dto.channels, template?.channels);
    const rendered = await this.renderContent(dto, template, payload);

    const [users, connectors] = await this.prisma.$transaction([
      this.prisma.user.findMany({
        where: { id: { in: recipientUserIds } },
        select: { id: true, email: true }
      }),
      this.prisma.notificationConnector.findMany({
        where: { code: { in: [NOTIFICATION_CONNECTOR_CODES.IN_APP, NOTIFICATION_CONNECTOR_CODES.SMTP_EMAIL] } }
      })
    ]);
    if (users.length === 0) {
      await this.writeNotificationLog({
        level: SystemLogLevel.WARN,
        message: 'Notification skipped because no recipient users were found',
        event: SYSTEM_LOG_EVENTS.NOTIFICATION_NO_RECIPIENTS,
        notificationEvent: dto.event,
        organizationId: dto.organizationId ?? null,
        context: { recipientUserIds }
      });
      return;
    }

    const userById = new Map(users.map((user) => [user.id, user]));
    const connectorByCode = new Map(connectors.map((connector) => [connector.code, connector]));

    for (const recipientUserId of recipientUserIds) {
      const user = userById.get(recipientUserId);
      if (!user) {
        await this.writeNotificationLog({
          level: SystemLogLevel.WARN,
          message: 'Notification recipient user was not found',
          event: SYSTEM_LOG_EVENTS.NOTIFICATION_NO_RECIPIENTS,
          notificationEvent: dto.event,
          organizationId: dto.organizationId ?? null,
          context: { recipientUserId }
        });
        continue;
      }

      const notification = await this.createNotification(dto, recipientUserId, payload, rendered);

      if (channels.includes(NotificationChannel.IN_APP)) {
        await this.deliverInApp(notification.id, connectorByCode.get(NOTIFICATION_CONNECTOR_CODES.IN_APP) ?? null);
      }

      if (channels.includes(NotificationChannel.EMAIL)) {
        await this.deliverEmail(
          notification.id,
          user.email,
          rendered.emailSubject,
          rendered.emailBody,
          connectorByCode.get(NOTIFICATION_CONNECTOR_CODES.SMTP_EMAIL) ?? null
        );
      }

      await this.pushNotificationCreated(recipientUserId, notification);
    }
  }

  async createStreamToken(currentUser: CurrentUser): Promise<NotificationStreamTokenResponseDto> {
    const expiresAt = new Date(Date.now() + NOTIFICATION_STREAM_TOKEN_TTL_SECONDS * 1000);
    const payload: NotificationStreamTokenPayload = {
      sub: currentUser.id,
      purpose: 'notification_stream'
    };
    const token = await this.jwtService.signAsync(payload, {
      expiresIn: NOTIFICATION_STREAM_TOKEN_TTL_SECONDS
    });

    return {
      token,
      expiresAt: expiresAt.toISOString(),
      expiresIn: NOTIFICATION_STREAM_TOKEN_TTL_SECONDS
    };
  }

  async validateStreamToken(token: string | undefined): Promise<{ userId: string }> {
    if (!token) {
      throw new UnauthorizedException('Notification stream token is required');
    }

    let payload: NotificationStreamTokenPayload;
    try {
      payload = await this.jwtService.verifyAsync<NotificationStreamTokenPayload>(token);
    } catch {
      throw new UnauthorizedException('Notification stream token is invalid');
    }

    if (payload.purpose !== 'notification_stream' || !payload.sub) {
      throw new UnauthorizedException('Notification stream token is invalid');
    }

    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
      select: { id: true, status: true }
    });

    if (!user || user.status !== UserStatus.ACTIVE) {
      throw new UnauthorizedException('Notification stream token is invalid');
    }

    return { userId: user.id };
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
    await this.pushNotificationRead(currentUser.id, updated.id);
    return this.toResponse(updated);
  }

  async markAllRead(currentUser: CurrentUser): Promise<{ updated: number }> {
    const result = await this.prisma.notification.updateMany({
      where: { recipientUserId: currentUser.id, status: NotificationStatus.UNREAD },
      data: { status: NotificationStatus.READ, readAt: new Date() }
    });
    await this.notificationsRealtimeService.publishToUser(currentUser.id, 'notifications.read_all', { unreadCount: 0 });
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
      const restrictedChannels = getAllowedNotificationChannelsForEvent(template.event);
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
        update: restrictedChannels
          ? {
              channels: [...restrictedChannels] as Prisma.InputJsonValue
            }
          : {}
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

  private async renderContent(
    dto: NotifyDto,
    template: { title: string; message: string; emailSubject: string | null; emailBody: string | null } | null,
    payload: Record<string, unknown>
  ): Promise<RenderedNotificationContent> {
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
      await this.writeNotificationLog({
        level: SystemLogLevel.ERROR,
        message: 'Failed to render notification template',
        event: SYSTEM_LOG_EVENTS.NOTIFICATION_TEMPLATE_RENDER_FAILED,
        notificationEvent: dto.event,
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

  private async createNotification(
    dto: NotifyDto,
    recipientUserId: string,
    payload: Record<string, unknown>,
    rendered: RenderedNotificationContent
  ): Promise<CreatedNotification> {
    try {
      return await this.prisma.notification.create({
        data: {
          organizationId: dto.organizationId ?? null,
          recipientUserId,
          event: dto.event,
          title: rendered.title,
          message: rendered.message,
          payload: payload as Prisma.InputJsonValue
        },
        select: {
          id: true,
          organizationId: true,
          event: true,
          title: true,
          message: true,
          status: true,
          createdAt: true
        }
      });
    } catch (error) {
      await this.writeNotificationLog({
        level: SystemLogLevel.ERROR,
        message: 'Failed to create notification row',
        event: SYSTEM_LOG_EVENTS.NOTIFICATION_SEND_FAILED,
        notificationEvent: dto.event,
        organizationId: dto.organizationId ?? null,
        context: { recipientUserId },
        errorStack: error instanceof Error ? error.stack ?? error.message : String(error)
      });
      throw error;
    }
  }

  private async pushNotificationCreated(recipientUserId: string, notification: CreatedNotification): Promise<void> {
    const unreadCount = await this.getUnreadCountForUser(recipientUserId);
    await this.notificationsRealtimeService.publishToUser(recipientUserId, 'notification.created', {
      notification,
      unreadCount
    });
  }

  private async pushNotificationRead(recipientUserId: string, notificationId: string): Promise<void> {
    const unreadCount = await this.getUnreadCountForUser(recipientUserId);
    await this.notificationsRealtimeService.publishToUser(recipientUserId, 'notification.read', {
      notificationId,
      unreadCount
    });
  }

  private async getUnreadCountForUser(recipientUserId: string): Promise<number> {
    return this.prisma.notification.count({
      where: { recipientUserId, status: NotificationStatus.UNREAD }
    });
  }

  private async deliverInApp(
    notificationId: string,
    connector: { code: string; status: NotificationConnectorStatus } | null
  ): Promise<void> {
    const delivery = await this.createDelivery(notificationId, NotificationChannel.IN_APP, NOTIFICATION_CONNECTOR_CODES.IN_APP);

    if (!connector || connector.status !== NotificationConnectorStatus.ENABLED) {
      const error = 'In-app connector is disabled';
      await this.prisma.notificationDelivery.update({
        where: { id: delivery.id },
        data: { status: NotificationDeliveryStatus.SKIPPED, error }
      });
      await this.writeNotificationLog({
        level: SystemLogLevel.WARN,
        message: error,
        event: SYSTEM_LOG_EVENTS.NOTIFICATION_CONNECTOR_FAILED,
        notificationEvent: null,
        context: {
          notificationId,
          channel: NotificationChannel.IN_APP,
          connectorCode: NOTIFICATION_CONNECTOR_CODES.IN_APP
        }
      });
      return;
    }

    try {
      const result = await this.inAppConnector.send({ channel: NotificationChannel.IN_APP });
      if (!result.ok) {
        await this.markInAppFailed(delivery.id, result.error ?? 'In-app delivery failed', notificationId);
        return;
      }
      await this.prisma.notificationDelivery.update({
        where: { id: delivery.id },
        data: { status: NotificationDeliveryStatus.SENT, sentAt: new Date(), error: null }
      });
    } catch (error) {
      await this.markInAppFailed(delivery.id, error instanceof Error ? error.message : String(error), notificationId, error);
    }
  }

  private async deliverEmail(
    notificationId: string,
    email: string | null,
    subject: string,
    body: string,
    connector: { code: string; status: NotificationConnectorStatus; config: Prisma.JsonValue } | null
  ): Promise<void> {
    const delivery = await this.createDelivery(notificationId, NotificationChannel.EMAIL, NOTIFICATION_CONNECTOR_CODES.SMTP_EMAIL);

    if (!connector || connector.status !== NotificationConnectorStatus.ENABLED) {
      const error = 'SMTP connector is disabled';
      await this.prisma.notificationDelivery.update({
        where: { id: delivery.id },
        data: { status: NotificationDeliveryStatus.SKIPPED, error }
      });
      await this.writeNotificationLog({
        level: SystemLogLevel.WARN,
        message: error,
        event: SYSTEM_LOG_EVENTS.NOTIFICATION_CONNECTOR_FAILED,
        notificationEvent: null,
        context: {
          notificationId,
          channel: NotificationChannel.EMAIL,
          connectorCode: NOTIFICATION_CONNECTOR_CODES.SMTP_EMAIL
        }
      });
      return;
    }
    if (!email) {
      const error = 'Recipient email is missing';
      await this.prisma.notificationDelivery.update({
        where: { id: delivery.id },
        data: { status: NotificationDeliveryStatus.SKIPPED, error }
      });
      await this.writeNotificationLog({
        level: SystemLogLevel.WARN,
        message: error,
        event: SYSTEM_LOG_EVENTS.NOTIFICATION_NO_RECIPIENTS,
        notificationEvent: null,
        context: {
          notificationId,
          channel: NotificationChannel.EMAIL,
          connectorCode: NOTIFICATION_CONNECTOR_CODES.SMTP_EMAIL
        }
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

  private async createDelivery(
    notificationId: string,
    channel: NotificationChannel,
    connectorCode: string
  ): Promise<{ id: string }> {
    try {
      return await this.prisma.notificationDelivery.create({
        data: {
          notificationId,
          channel,
          status: NotificationDeliveryStatus.PENDING,
          connectorCode
        },
        select: { id: true }
      });
    } catch (error) {
      await this.writeNotificationLog({
        level: SystemLogLevel.ERROR,
        message: 'Failed to create notification delivery row',
        event: SYSTEM_LOG_EVENTS.NOTIFICATION_DELIVERY_FAILED,
        notificationEvent: null,
        context: { notificationId, channel, connectorCode },
        errorStack: error instanceof Error ? error.stack ?? error.message : String(error)
      });
      throw error;
    }
  }

  private async markInAppFailed(deliveryId: string, errorMessage: string, notificationId: string, rawError?: unknown): Promise<void> {
    await this.prisma.notificationDelivery.update({
      where: { id: deliveryId },
      data: { status: NotificationDeliveryStatus.FAILED, error: errorMessage }
    });
    await this.writeNotificationLog({
      level: SystemLogLevel.ERROR,
      message: 'Notification in-app delivery failed',
      event: SYSTEM_LOG_EVENTS.NOTIFICATION_DELIVERY_FAILED,
      notificationEvent: null,
      context: {
        notificationId,
        channel: NotificationChannel.IN_APP,
        connectorCode: NOTIFICATION_CONNECTOR_CODES.IN_APP,
        error: errorMessage
      },
      errorStack: rawError instanceof Error ? rawError.stack ?? rawError.message : undefined
    });
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

  private async writeNotificationLog(input: {
    level: SystemLogLevel;
    message: string;
    event: string;
    notificationEvent: string | null;
    organizationId?: string | null;
    context?: Record<string, unknown>;
    errorStack?: string;
  }): Promise<void> {
    await this.systemLogsService.write({
      level: input.level,
      source: SYSTEM_LOG_SOURCES.NOTIFICATIONS,
      message: input.message,
      context: {
        event: input.event,
        notificationEvent: input.notificationEvent,
        ...(input.context ?? {})
      },
      errorStack: input.errorStack,
      organizationId: input.organizationId ?? null
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

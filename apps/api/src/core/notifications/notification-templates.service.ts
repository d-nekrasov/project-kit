import { BadRequestException, ForbiddenException, Injectable } from '@nestjs/common';
import { NotificationChannel, NotificationTemplate, Prisma } from '@prisma/client';
import { RequestMetadata } from '../../common/utils/request-metadata.util';
import { PrismaService } from '../../infrastructure/prisma/prisma.service';
import { AUDIT_ACTIONS, AUDIT_ENTITY_TYPES } from '../audit-logs/constants/audit-actions.constants';
import { AuditLogsService } from '../audit-logs/audit-logs.service';
import { CurrentUser } from '../auth/types/current-user.type';
import { CurrentOrganization } from '../organization-context/types/current-organization.type';
import { getAllowedNotificationChannelsForEvent } from './constants/notification-events.constants';
import { NotificationTemplateResponseDto } from './dto/notification-template-response.dto';
import { UpdateNotificationTemplateDto } from './dto/update-notification-template.dto';

@Injectable()
export class NotificationTemplatesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLogsService: AuditLogsService
  ) {}

  async findAll(search: string | undefined, currentUser: CurrentUser): Promise<NotificationTemplateResponseDto[]> {
    this.ensureSuperAdmin(currentUser);
    const normalizedSearch = search?.trim();
    const templates = await this.prisma.notificationTemplate.findMany({
      where: normalizedSearch
        ? {
            OR: [
              { event: { contains: normalizedSearch, mode: 'insensitive' } },
              { title: { contains: normalizedSearch, mode: 'insensitive' } },
              { message: { contains: normalizedSearch, mode: 'insensitive' } }
            ]
          }
        : {},
      orderBy: { event: 'asc' }
    });
    return templates.map((template) => this.toResponse(template));
  }

  async upsert(
    event: string,
    dto: UpdateNotificationTemplateDto,
    currentUser: CurrentUser,
    currentOrganization: CurrentOrganization,
    requestMetadata?: RequestMetadata
  ): Promise<NotificationTemplateResponseDto> {
    this.ensureSuperAdmin(currentUser);
    const channels = this.normalizeChannelsForEvent(event, dto.channels);
    const template = await this.prisma.notificationTemplate.upsert({
      where: { event },
      create: {
        event,
        title: dto.title,
        message: dto.message,
        emailSubject: dto.emailSubject ?? null,
        emailBody: dto.emailBody ?? null,
        channels: channels as Prisma.InputJsonValue
      },
      update: {
        title: dto.title,
        message: dto.message,
        emailSubject: dto.emailSubject ?? null,
        emailBody: dto.emailBody ?? null,
        channels: channels as Prisma.InputJsonValue
      }
    });

    await this.auditLogsService.write({
      userId: currentUser.id,
      organizationId: currentOrganization.id,
      action: AUDIT_ACTIONS.NOTIFICATION_TEMPLATE_UPDATE,
      entityType: AUDIT_ENTITY_TYPES.NOTIFICATION_TEMPLATE,
      entityId: template.id,
      metadata: { event: template.event, channels },
      ip: requestMetadata?.ip,
      userAgent: requestMetadata?.userAgent
    });

    return this.toResponse(template);
  }

  private ensureSuperAdmin(currentUser: CurrentUser): void {
    if (!currentUser.systemRoles.includes('super_admin')) {
      throw new ForbiddenException('Only super admin can manage notification templates');
    }
  }

  private normalizeChannelsForEvent(
    event: string,
    channels: NotificationChannel[]
  ): NotificationChannel[] {
    const allowedChannels = getAllowedNotificationChannelsForEvent(event);
    if (!allowedChannels) {
      return channels;
    }

    const unexpectedChannels = channels.filter((channel) => !allowedChannels.includes(channel));
    if (unexpectedChannels.length > 0) {
      throw new BadRequestException(
        `Notification template "${event}" supports only these channels: ${allowedChannels.join(', ')}`
      );
    }

    return [...allowedChannels];
  }

  private toResponse(template: NotificationTemplate): NotificationTemplateResponseDto {
    return {
      id: template.id,
      event: template.event,
      title: template.title,
      message: template.message,
      emailSubject: template.emailSubject,
      emailBody: template.emailBody,
      channels: this.parseChannels(template.channels),
      createdAt: template.createdAt,
      updatedAt: template.updatedAt
    };
  }

  private parseChannels(value: Prisma.JsonValue): NotificationChannel[] {
    if (!Array.isArray(value)) {
      return [];
    }
    return value.filter((item): item is NotificationChannel => {
      return typeof item === 'string' && Object.values(NotificationChannel).includes(item as NotificationChannel);
    });
  }
}

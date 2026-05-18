import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, SystemLogLevel } from '@prisma/client';
import { RequestMetadata } from '../../common/utils/request-metadata.util';
import { AuditLogsService } from '../../core/audit-logs/audit-logs.service';
import { CurrentUser } from '../../core/auth/types/current-user.type';
import { NotificationsService } from '../../core/notifications/notifications.service';
import { CurrentOrganization } from '../../core/organization-context/types/current-organization.type';
import { SYSTEM_LOG_EVENTS } from '../../core/system-logs/constants/system-log-events.constants';
import { SYSTEM_LOG_SOURCES } from '../../core/system-logs/constants/system-log-sources.constants';
import { SystemLogsService } from '../../core/system-logs/system-logs.service';
import { PrismaService } from '../../infrastructure/prisma/prisma.service';
import { DOCUMENT_AUDIT_ACTIONS, DOCUMENT_AUDIT_ENTITY_TYPES } from './constants/document-audit.constants';
import { CreateDocumentDto } from './dto/create-document.dto';
import { DocumentResponseDto } from './dto/document-response.dto';
import { DocumentsListQueryDto } from './dto/documents-list-query.dto';
import { UpdateDocumentStatusDto } from './dto/update-document-status.dto';
import { UpdateDocumentDto } from './dto/update-document.dto';

const DOCUMENT_INCLUDE = {
  createdBy: { select: { id: true, email: true, name: true } },
  updatedBy: { select: { id: true, email: true, name: true } }
} satisfies Prisma.DocumentInclude;

@Injectable()
export class DocumentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLogsService: AuditLogsService,
    private readonly notificationsService: NotificationsService,
    private readonly systemLogsService: SystemLogsService
  ) {}

  async findAll(
    query: DocumentsListQueryDto,
    currentOrganization: CurrentOrganization
  ): Promise<{ items: DocumentResponseDto[]; meta: { page: number; limit: number; total: number; totalPages: number } }> {
    const page = query.page ?? 1;
    const limit = Math.min(query.limit ?? 20, 100);
    const skip = (page - 1) * limit;
    const search = query.search?.trim();

    const where: Prisma.DocumentWhereInput = {
      organizationId: currentOrganization.id,
      ...(query.status ? { status: query.status } : {}),
      ...(query.createdById ? { createdById: query.createdById } : {}),
      ...(search
        ? {
            OR: [
              { title: { contains: search, mode: 'insensitive' } },
              { content: { contains: search, mode: 'insensitive' } }
            ]
          }
        : {})
    };

    const [items, total] = await this.prisma.$transaction([
      this.prisma.document.findMany({
        where,
        include: DOCUMENT_INCLUDE,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' }
      }),
      this.prisma.document.count({ where })
    ]);

    return {
      items: items.map((item) => this.toDocumentResponse(item)),
      meta: { page, limit, total, totalPages: Math.ceil(total / limit) || 1 }
    };
  }

  async findById(id: string, currentOrganization: CurrentOrganization): Promise<DocumentResponseDto> {
    const document = await this.prisma.document.findFirst({
      where: { id, organizationId: currentOrganization.id },
      include: DOCUMENT_INCLUDE
    });
    if (!document) throw new NotFoundException('Document not found');
    return this.toDocumentResponse(document);
  }

  async create(
    dto: CreateDocumentDto,
    currentUser: CurrentUser,
    currentOrganization: CurrentOrganization,
    requestMetadata?: RequestMetadata
  ): Promise<DocumentResponseDto> {
    const document = await this.prisma.document.create({
      data: {
        organizationId: currentOrganization.id,
        title: dto.title,
        content: dto.content,
        createdById: currentUser.id
      },
      include: DOCUMENT_INCLUDE
    });

    await this.auditLogsService.write({
      action: DOCUMENT_AUDIT_ACTIONS.DOCUMENT_CREATE,
      entityType: DOCUMENT_AUDIT_ENTITY_TYPES.DOCUMENT,
      entityId: document.id,
      userId: currentUser.id,
      organizationId: currentOrganization.id,
      metadata: { title: document.title },
      ip: requestMetadata?.ip,
      userAgent: requestMetadata?.userAgent
    });

    return this.toDocumentResponse(document);
  }

  async update(
    id: string,
    dto: UpdateDocumentDto,
    currentUser: CurrentUser,
    currentOrganization: CurrentOrganization,
    requestMetadata?: RequestMetadata
  ): Promise<DocumentResponseDto> {
    await this.ensureExists(id, currentOrganization.id);
    const changedFields = [dto.title !== undefined ? 'title' : null, dto.content !== undefined ? 'content' : null].filter(Boolean);

    const document = await this.prisma.document.update({
      where: { id },
      data: {
        ...(dto.title !== undefined ? { title: dto.title } : {}),
        ...(dto.content !== undefined ? { content: dto.content } : {}),
        updatedById: currentUser.id
      },
      include: DOCUMENT_INCLUDE
    });

    await this.auditLogsService.write({
      action: DOCUMENT_AUDIT_ACTIONS.DOCUMENT_UPDATE,
      entityType: DOCUMENT_AUDIT_ENTITY_TYPES.DOCUMENT,
      entityId: document.id,
      userId: currentUser.id,
      organizationId: currentOrganization.id,
      metadata: { changedFields },
      ip: requestMetadata?.ip,
      userAgent: requestMetadata?.userAgent
    });

    return this.toDocumentResponse(document);
  }

  async updateStatus(
    id: string,
    dto: UpdateDocumentStatusDto,
    currentUser: CurrentUser,
    currentOrganization: CurrentOrganization,
    requestMetadata?: RequestMetadata
  ): Promise<DocumentResponseDto> {
    const existing = await this.prisma.document.findFirst({
      where: { id, organizationId: currentOrganization.id },
      select: { id: true, title: true, status: true, createdById: true }
    });
    if (!existing) throw new NotFoundException('Document not found');

    const document = await this.prisma.document.update({
      where: { id },
      data: { status: dto.status, updatedById: currentUser.id },
      include: DOCUMENT_INCLUDE
    });

    await this.auditLogsService.write({
      action: DOCUMENT_AUDIT_ACTIONS.DOCUMENT_STATUS_UPDATE,
      entityType: DOCUMENT_AUDIT_ENTITY_TYPES.DOCUMENT,
      entityId: document.id,
      userId: currentUser.id,
      organizationId: currentOrganization.id,
      metadata: { status: dto.status },
      ip: requestMetadata?.ip,
      userAgent: requestMetadata?.userAgent
    });

    if (existing.status !== dto.status && existing.createdById !== currentUser.id) {
      try {
        await this.notificationsService.notify({
          event: 'document.status_changed',
          organizationId: currentOrganization.id,
          recipientUserIds: [existing.createdById],
          payload: {
            documentId: document.id,
            title: document.title,
            status: document.status
          }
        });
      } catch (error) {
        await this.systemLogsService.write({
          level: SystemLogLevel.ERROR,
          source: SYSTEM_LOG_SOURCES.NOTIFICATIONS,
          message: 'Failed to create document status notification',
          context: {
            event: SYSTEM_LOG_EVENTS.NOTIFICATION_DELIVERY_FAILED,
            documentId: document.id,
            notificationEvent: 'document.status_changed'
          },
          errorStack: error instanceof Error ? error.stack ?? error.message : String(error),
          userId: currentUser.id,
          organizationId: currentOrganization.id
        });
      }
    }

    return this.toDocumentResponse(document);
  }

  private async ensureExists(id: string, organizationId: string): Promise<void> {
    const exists = await this.prisma.document.findFirst({
      where: { id, organizationId },
      select: { id: true }
    });
    if (!exists) throw new NotFoundException('Document not found');
  }

  private toDocumentResponse(
    document: Prisma.DocumentGetPayload<{ include: typeof DOCUMENT_INCLUDE }>
  ): DocumentResponseDto {
    return {
      id: document.id,
      organizationId: document.organizationId,
      title: document.title,
      content: document.content,
      status: document.status,
      createdBy: document.createdBy,
      updatedBy: document.updatedBy,
      createdAt: document.createdAt,
      updatedAt: document.updatedAt
    };
  }
}

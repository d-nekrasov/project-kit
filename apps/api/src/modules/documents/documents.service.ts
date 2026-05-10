import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { RequestMetadata } from '../../common/utils/request-metadata.util';
import { AuditLogsService } from '../../core/audit-logs/audit-logs.service';
import { CurrentUser } from '../../core/auth/types/current-user.type';
import { CurrentOrganization } from '../../core/organization-context/types/current-organization.type';
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
    private readonly auditLogsService: AuditLogsService
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
    await this.ensureExists(id, currentOrganization.id);

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

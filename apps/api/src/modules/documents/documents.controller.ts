import { Body, Controller, Get, Param, Patch, Post, Query, Req, UseGuards } from '@nestjs/common';
import { getRequestMetadata } from '../../common/utils/request-metadata.util';
import { CurrentUser } from '../../core/auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../../core/auth/guards/jwt-auth.guard';
import { ModuleKey } from '../../core/module-registry/decorators/module-key.decorator';
import { ModuleEnabledGuard } from '../../core/module-registry/guards/module-enabled.guard';
import { CurrentUser as CurrentUserType } from '../../core/auth/types/current-user.type';
import { CurrentOrganization } from '../../core/organization-context/decorators/current-organization.decorator';
import { OrganizationGuard } from '../../core/organization-context/guards/organization.guard';
import { CurrentOrganization as CurrentOrganizationType } from '../../core/organization-context/types/current-organization.type';
import { Permissions } from '../../core/permissions/decorators/permissions.decorator';
import { PermissionsGuard } from '../../core/permissions/guards/permissions.guard';
import { CreateDocumentDto } from './dto/create-document.dto';
import { DocumentResponseDto } from './dto/document-response.dto';
import { DocumentsListQueryDto } from './dto/documents-list-query.dto';
import { UpdateDocumentStatusDto } from './dto/update-document-status.dto';
import { UpdateDocumentDto } from './dto/update-document.dto';
import { DocumentsService } from './documents.service';

@Controller('documents')
@ModuleKey('documents')
@UseGuards(JwtAuthGuard, OrganizationGuard, ModuleEnabledGuard, PermissionsGuard)
export class DocumentsController {
  constructor(private readonly documentsService: DocumentsService) {}

  @Get()
  @Permissions('documents.read')
  findAll(
    @CurrentOrganization() currentOrganization: CurrentOrganizationType,
    @Query() query: DocumentsListQueryDto
  ): Promise<{ items: DocumentResponseDto[]; meta: { page: number; limit: number; total: number; totalPages: number } }> {
    return this.documentsService.findAll(query, currentOrganization);
  }

  @Get(':id')
  @Permissions('documents.read')
  findById(
    @Param('id') id: string,
    @CurrentOrganization() currentOrganization: CurrentOrganizationType
  ): Promise<DocumentResponseDto> {
    return this.documentsService.findById(id, currentOrganization);
  }

  @Post()
  @Permissions('documents.create')
  create(
    @Body() dto: CreateDocumentDto,
    @CurrentUser() currentUser: CurrentUserType,
    @CurrentOrganization() currentOrganization: CurrentOrganizationType,
    @Req() req: { headers: Record<string, string | string[] | undefined>; ip?: string }
  ): Promise<DocumentResponseDto> {
    return this.documentsService.create(dto, currentUser, currentOrganization, getRequestMetadata(req));
  }

  @Patch(':id')
  @Permissions('documents.update')
  update(
    @Param('id') id: string,
    @Body() dto: UpdateDocumentDto,
    @CurrentUser() currentUser: CurrentUserType,
    @CurrentOrganization() currentOrganization: CurrentOrganizationType,
    @Req() req: { headers: Record<string, string | string[] | undefined>; ip?: string }
  ): Promise<DocumentResponseDto> {
    return this.documentsService.update(id, dto, currentUser, currentOrganization, getRequestMetadata(req));
  }

  @Patch(':id/status')
  @Permissions('documents.delete')
  updateStatus(
    @Param('id') id: string,
    @Body() dto: UpdateDocumentStatusDto,
    @CurrentUser() currentUser: CurrentUserType,
    @CurrentOrganization() currentOrganization: CurrentOrganizationType,
    @Req() req: { headers: Record<string, string | string[] | undefined>; ip?: string }
  ): Promise<DocumentResponseDto> {
    return this.documentsService.updateStatus(id, dto, currentUser, currentOrganization, getRequestMetadata(req));
  }
}

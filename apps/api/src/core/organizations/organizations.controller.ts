import { Body, Controller, Get, Param, Patch, Post, Query, Req, UseGuards } from '@nestjs/common';
import { getRequestMetadata } from '../../common/utils/request-metadata.util';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser as CurrentUserType } from '../auth/types/current-user.type';
import { CurrentOrganization } from '../organization-context/decorators/current-organization.decorator';
import { OrganizationGuard } from '../organization-context/guards/organization.guard';
import { CurrentOrganization as CurrentOrganizationType } from '../organization-context/types/current-organization.type';
import { Permissions } from '../permissions/decorators/permissions.decorator';
import { PermissionsGuard } from '../permissions/guards/permissions.guard';
import { CreateOrganizationDto } from './dto/create-organization.dto';
import { OrganizationResponseDto } from './dto/organization-response.dto';
import { OrganizationsListQueryDto } from './dto/organizations-list-query.dto';
import { UpdateOrganizationStatusDto } from './dto/update-organization-status.dto';
import { UpdateOrganizationDto } from './dto/update-organization.dto';
import { OrganizationsService } from './organizations.service';

@Controller('organizations')
export class OrganizationsController {
  constructor(private readonly organizationsService: OrganizationsService) {}

  @Get()
  @UseGuards(JwtAuthGuard, OrganizationGuard, PermissionsGuard)
  @Permissions('organizations.read')
  findAll(
    @CurrentUser() currentUser: CurrentUserType,
    @Query() query: OrganizationsListQueryDto
  ): Promise<{
    items: OrganizationResponseDto[];
    meta: { page: number; limit: number; total: number; totalPages: number };
  }> {
    return this.organizationsService.findAll(currentUser, query);
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard, OrganizationGuard, PermissionsGuard)
  @Permissions('organizations.read')
  findById(
    @CurrentUser() currentUser: CurrentUserType,
    @Param('id') organizationId: string
  ): Promise<OrganizationResponseDto> {
    return this.organizationsService.findById(currentUser, organizationId);
  }

  @Post()
  @UseGuards(JwtAuthGuard, OrganizationGuard, PermissionsGuard)
  @Permissions('organizations.create')
  create(
    @CurrentUser() currentUser: CurrentUserType,
    @Body() dto: CreateOrganizationDto,
    @Req() req: { headers: Record<string, string | string[] | undefined>; ip?: string }
  ): Promise<OrganizationResponseDto> {
    return this.organizationsService.create(currentUser, dto, getRequestMetadata(req));
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, OrganizationGuard, PermissionsGuard)
  @Permissions('organizations.update')
  update(
    @CurrentUser() currentUser: CurrentUserType,
    @CurrentOrganization() currentOrganization: CurrentOrganizationType,
    @Param('id') organizationId: string,
    @Body() dto: UpdateOrganizationDto,
    @Req() req: { headers: Record<string, string | string[] | undefined>; ip?: string }
  ): Promise<OrganizationResponseDto> {
    return this.organizationsService.update(
      currentUser,
      currentOrganization,
      organizationId,
      dto,
      getRequestMetadata(req)
    );
  }

  @Patch(':id/status')
  @UseGuards(JwtAuthGuard, OrganizationGuard, PermissionsGuard)
  @Permissions('organizations.delete')
  updateStatus(
    @CurrentUser() currentUser: CurrentUserType,
    @Param('id') organizationId: string,
    @Body() dto: UpdateOrganizationStatusDto,
    @Req() req: { headers: Record<string, string | string[] | undefined>; ip?: string }
  ): Promise<OrganizationResponseDto> {
    return this.organizationsService.updateStatus(currentUser, organizationId, dto.status, getRequestMetadata(req));
  }
}

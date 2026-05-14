import { Body, Controller, Get, Param, Patch, Post, Query, Req, UseGuards } from '@nestjs/common';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { CurrentUser as CurrentUserType } from '../auth/types/current-user.type';
import { getRequestMetadata } from '../../common/utils/request-metadata.util';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentOrganization } from '../organization-context/decorators/current-organization.decorator';
import { OrganizationGuard } from '../organization-context/guards/organization.guard';
import { CurrentOrganization as CurrentOrganizationType } from '../organization-context/types/current-organization.type';
import { Permissions } from '../permissions/decorators/permissions.decorator';
import { PermissionsGuard } from '../permissions/guards/permissions.guard';
import { CreateRoleDto } from './dto/create-role.dto';
import { RoleResponseDto } from './dto/role-response.dto';
import { RolesListQueryDto } from './dto/roles-list-query.dto';
import { UpdateRolePermissionsDto } from './dto/update-role-permissions.dto';
import { UpdateRoleDto } from './dto/update-role.dto';
import { RolesService } from './roles.service';

@Controller('roles')
export class RolesController {
  constructor(private readonly rolesService: RolesService) {}

  @Get()
  @UseGuards(JwtAuthGuard, OrganizationGuard, PermissionsGuard)
  @Permissions('roles.read')
  findAll(
    @CurrentUser() currentUser: CurrentUserType,
    @CurrentOrganization() organization: CurrentOrganizationType,
    @Query() query: RolesListQueryDto
  ): Promise<{
    items: RoleResponseDto[];
    meta: { page: number; limit: number; total: number; totalPages: number };
  }> {
    return this.rolesService.findAll(organization.id, currentUser, query);
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard, OrganizationGuard, PermissionsGuard)
  @Permissions('roles.read')
  findById(
    @CurrentOrganization() organization: CurrentOrganizationType,
    @Param('id') roleId: string
  ): Promise<RoleResponseDto> {
    return this.rolesService.findById(roleId, organization.id);
  }

  @Post()
  @UseGuards(JwtAuthGuard, OrganizationGuard, PermissionsGuard)
  @Permissions('roles.create')
  create(
    @CurrentUser() currentUser: CurrentUserType,
    @CurrentOrganization() organization: CurrentOrganizationType,
    @Body() dto: CreateRoleDto,
    @Req() req: { headers: Record<string, string | string[] | undefined>; ip?: string }
  ): Promise<RoleResponseDto> {
    return this.rolesService.create(organization.id, currentUser, dto, getRequestMetadata(req));
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, OrganizationGuard, PermissionsGuard)
  @Permissions('roles.update')
  update(
    @CurrentUser() currentUser: CurrentUserType,
    @CurrentOrganization() organization: CurrentOrganizationType,
    @Param('id') roleId: string,
    @Body() dto: UpdateRoleDto,
    @Req() req: { headers: Record<string, string | string[] | undefined>; ip?: string }
  ): Promise<RoleResponseDto> {
    return this.rolesService.update(roleId, currentUser, organization.id, dto, getRequestMetadata(req));
  }

  @Patch(':id/permissions')
  @UseGuards(JwtAuthGuard, OrganizationGuard, PermissionsGuard)
  @Permissions('roles.update')
  updatePermissions(
    @CurrentUser() currentUser: CurrentUserType,
    @CurrentOrganization() organization: CurrentOrganizationType,
    @Param('id') roleId: string,
    @Body() dto: UpdateRolePermissionsDto,
    @Req() req: { headers: Record<string, string | string[] | undefined>; ip?: string }
  ): Promise<RoleResponseDto> {
    return this.rolesService.updatePermissions(roleId, currentUser, organization.id, dto, getRequestMetadata(req));
  }
}

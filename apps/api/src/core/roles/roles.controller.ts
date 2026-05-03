import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
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
    @CurrentOrganization() organization: CurrentOrganizationType,
    @Query() query: RolesListQueryDto
  ): Promise<{
    items: RoleResponseDto[];
    meta: { page: number; limit: number; total: number; totalPages: number };
  }> {
    return this.rolesService.findAll(organization.id, query);
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
    @CurrentOrganization() organization: CurrentOrganizationType,
    @Body() dto: CreateRoleDto
  ): Promise<RoleResponseDto> {
    return this.rolesService.create(organization.id, dto);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, OrganizationGuard, PermissionsGuard)
  @Permissions('roles.update')
  update(
    @CurrentOrganization() organization: CurrentOrganizationType,
    @Param('id') roleId: string,
    @Body() dto: UpdateRoleDto
  ): Promise<RoleResponseDto> {
    return this.rolesService.update(roleId, organization.id, dto);
  }

  @Patch(':id/permissions')
  @UseGuards(JwtAuthGuard, OrganizationGuard, PermissionsGuard)
  @Permissions('roles.update')
  updatePermissions(
    @CurrentOrganization() organization: CurrentOrganizationType,
    @Param('id') roleId: string,
    @Body() dto: UpdateRolePermissionsDto
  ): Promise<RoleResponseDto> {
    return this.rolesService.updatePermissions(roleId, organization.id, dto);
  }
}

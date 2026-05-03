import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { OrganizationGuard } from '../organization-context/guards/organization.guard';
import { Permissions } from './decorators/permissions.decorator';
import { GroupedPermissionsResponseDto } from './dto/grouped-permissions-response.dto';
import { PermissionModuleResponseDto } from './dto/permission-module-response.dto';
import { PermissionResponseDto } from './dto/permission-response.dto';
import { PermissionsListQueryDto } from './dto/permissions-list-query.dto';
import { PermissionsGuard } from './guards/permissions.guard';
import { PermissionsService } from './permissions.service';

@Controller('permissions')
@UseGuards(JwtAuthGuard, OrganizationGuard, PermissionsGuard)
@Permissions('permissions.read')
export class PermissionsController {
  constructor(private readonly permissionsService: PermissionsService) {}

  @Get()
  findAll(@Query() query: PermissionsListQueryDto): Promise<{
    items: PermissionResponseDto[];
    meta: { page: number; limit: number; total: number; totalPages: number };
  }> {
    return this.permissionsService.findAll(query);
  }

  @Get('grouped')
  findGrouped(@Query() query: PermissionsListQueryDto): Promise<GroupedPermissionsResponseDto> {
    return this.permissionsService.findGrouped({
      search: query.search,
      module: query.module
    });
  }

  @Get('modules')
  findModules(): Promise<{ items: PermissionModuleResponseDto[] }> {
    return this.permissionsService.findModules();
  }
}

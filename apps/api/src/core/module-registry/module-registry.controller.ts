import { Body, Controller, Get, Param, Patch, Query, Req, UseGuards } from '@nestjs/common';
import { ModuleStatus } from '@prisma/client';
import { getRequestMetadata } from '../../common/utils/request-metadata.util';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser as CurrentUserType } from '../auth/types/current-user.type';
import { CurrentOrganization } from '../organization-context/decorators/current-organization.decorator';
import { OrganizationGuard } from '../organization-context/guards/organization.guard';
import { CurrentOrganization as CurrentOrganizationType } from '../organization-context/types/current-organization.type';
import { Permissions } from '../permissions/decorators/permissions.decorator';
import { PermissionsGuard } from '../permissions/guards/permissions.guard';
import { ModuleRegistryListQueryDto } from './dto/module-registry-list-query.dto';
import { ModuleRegistryResponseDto } from './dto/module-registry-response.dto';
import { UpdateModuleStatusDto } from './dto/update-module-status.dto';
import { ModuleRegistryService } from './module-registry.service';

@Controller('modules')
@UseGuards(JwtAuthGuard, OrganizationGuard, PermissionsGuard)
export class ModuleRegistryController {
  constructor(private readonly moduleRegistryService: ModuleRegistryService) {}

  @Get()
  @Permissions('modules.read')
  findAll(@Query() query: ModuleRegistryListQueryDto): Promise<{
    items: ModuleRegistryResponseDto[];
    meta: { page: number; limit: number; total: number; totalPages: number };
  }> {
    return this.moduleRegistryService.findAll(query);
  }

  @Get(':name')
  @Permissions('modules.read')
  findByName(@Param('name') name: string): Promise<ModuleRegistryResponseDto> {
    return this.moduleRegistryService.findByName(name);
  }

  @Patch(':name/status')
  @Permissions('modules.update')
  updateStatus(
    @CurrentUser() currentUser: CurrentUserType,
    @CurrentOrganization() currentOrganization: CurrentOrganizationType,
    @Param('name') name: string,
    @Body() dto: UpdateModuleStatusDto,
    @Req() req: { headers: Record<string, string | string[] | undefined>; ip?: string }
  ): Promise<ModuleRegistryResponseDto> {
    return this.moduleRegistryService.updateStatus(
      currentUser,
      currentOrganization,
      name,
      dto.status as ModuleStatus,
      getRequestMetadata(req)
    );
  }
}

import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser as CurrentUserType } from '../auth/types/current-user.type';
import { CurrentOrganization } from '../organization-context/decorators/current-organization.decorator';
import { OrganizationGuard } from '../organization-context/guards/organization.guard';
import { CurrentOrganization as CurrentOrganizationType } from '../organization-context/types/current-organization.type';
import { Permissions } from '../permissions/decorators/permissions.decorator';
import { PermissionsGuard } from '../permissions/guards/permissions.guard';
import { SystemLogResponseDto } from './dto/system-log-response.dto';
import { SystemLogsListQueryDto } from './dto/system-logs-list-query.dto';
import { SystemLogsService } from './system-logs.service';

@Controller('system-logs')
@UseGuards(JwtAuthGuard, OrganizationGuard, PermissionsGuard)
@Permissions('systemLogs.read')
export class SystemLogsController {
  constructor(private readonly systemLogsService: SystemLogsService) {}

  @Get()
  findAll(
    @Query() query: SystemLogsListQueryDto,
    @CurrentUser() currentUser: CurrentUserType,
    @CurrentOrganization() currentOrganization: CurrentOrganizationType
  ): Promise<{ items: SystemLogResponseDto[]; meta: { page: number; limit: number; total: number; totalPages: number } }> {
    return this.systemLogsService.findAll(query, currentUser, currentOrganization);
  }

  @Get(':id')
  findById(
    @Param('id') id: string,
    @CurrentUser() currentUser: CurrentUserType,
    @CurrentOrganization() currentOrganization: CurrentOrganizationType
  ): Promise<SystemLogResponseDto> {
    return this.systemLogsService.findById(id, currentUser, currentOrganization);
  }
}

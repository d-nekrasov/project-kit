import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser as CurrentUserType } from '../auth/types/current-user.type';
import { CurrentOrganization } from '../organization-context/decorators/current-organization.decorator';
import { OrganizationGuard } from '../organization-context/guards/organization.guard';
import { CurrentOrganization as CurrentOrganizationType } from '../organization-context/types/current-organization.type';
import { Permissions } from '../permissions/decorators/permissions.decorator';
import { PermissionsGuard } from '../permissions/guards/permissions.guard';
import { AuditLogsService } from './audit-logs.service';
import { AuditLogResponseDto } from './dto/audit-log-response.dto';
import { AuditLogsListQueryDto } from './dto/audit-logs-list-query.dto';

@Controller('audit-logs')
@UseGuards(JwtAuthGuard, OrganizationGuard, PermissionsGuard)
@Permissions('auditLogs.read')
export class AuditLogsController {
  constructor(private readonly auditLogsService: AuditLogsService) {}

  @Get()
  findAll(
    @Query() query: AuditLogsListQueryDto,
    @CurrentUser() currentUser: CurrentUserType,
    @CurrentOrganization() currentOrganization: CurrentOrganizationType
  ): Promise<{ items: AuditLogResponseDto[]; meta: { page: number; limit: number; total: number; totalPages: number } }> {
    return this.auditLogsService.findAll(query, currentUser, currentOrganization);
  }

  @Get(':id')
  findById(
    @Param('id') id: string,
    @CurrentUser() currentUser: CurrentUserType,
    @CurrentOrganization() currentOrganization: CurrentOrganizationType
  ): Promise<AuditLogResponseDto> {
    return this.auditLogsService.findById(id, currentUser, currentOrganization);
  }
}

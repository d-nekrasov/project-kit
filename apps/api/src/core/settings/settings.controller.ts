import { Body, Controller, Get, Param, Put, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { CurrentUser as CurrentUserType } from '../auth/types/current-user.type';
import { CurrentOrganization } from '../organization-context/decorators/current-organization.decorator';
import { OrganizationGuard } from '../organization-context/guards/organization.guard';
import { CurrentOrganization as CurrentOrganizationType } from '../organization-context/types/current-organization.type';
import { Permissions } from '../permissions/decorators/permissions.decorator';
import { PermissionsGuard } from '../permissions/guards/permissions.guard';
import { GetSettingQueryDto } from './dto/get-setting-query.dto';
import { SettingResponseDto } from './dto/setting-response.dto';
import { SettingsListQueryDto } from './dto/settings-list-query.dto';
import { UpsertSettingDto } from './dto/upsert-setting.dto';
import { SettingsService } from './settings.service';

@Controller('settings')
@UseGuards(JwtAuthGuard, OrganizationGuard, PermissionsGuard)
export class SettingsController {
  constructor(private readonly settingsService: SettingsService) {}

  @Get()
  @Permissions('settings.read')
  findAll(
    @Query() query: SettingsListQueryDto,
    @CurrentUser() user: CurrentUserType,
    @CurrentOrganization() organization: CurrentOrganizationType
  ): Promise<{
    items: SettingResponseDto[];
    meta: { page: number; limit: number; total: number; totalPages: number };
  }> {
    return this.settingsService.findAll(query, user, organization);
  }

  @Get(':key')
  @Permissions('settings.read')
  findOne(
    @Param('key') key: string,
    @Query() query: GetSettingQueryDto,
    @CurrentOrganization() organization: CurrentOrganizationType
  ): Promise<SettingResponseDto> {
    return this.settingsService.findByKey(key, query, organization);
  }

  @Put(':key')
  @Permissions('settings.update')
  upsert(
    @Param('key') key: string,
    @Body() dto: UpsertSettingDto,
    @CurrentUser() user: CurrentUserType,
    @CurrentOrganization() organization: CurrentOrganizationType
  ): Promise<SettingResponseDto> {
    return this.settingsService.upsert(key, dto, user, organization);
  }
}

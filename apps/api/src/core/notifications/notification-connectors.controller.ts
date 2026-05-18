import { Body, Controller, Get, Param, Patch, Req, UseGuards } from '@nestjs/common';
import { getRequestMetadata } from '../../common/utils/request-metadata.util';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser as CurrentUserType } from '../auth/types/current-user.type';
import { CurrentOrganization } from '../organization-context/decorators/current-organization.decorator';
import { OrganizationGuard } from '../organization-context/guards/organization.guard';
import { CurrentOrganization as CurrentOrganizationType } from '../organization-context/types/current-organization.type';
import { Permissions } from '../permissions/decorators/permissions.decorator';
import { PermissionsGuard } from '../permissions/guards/permissions.guard';
import { NotificationConnectorsService } from './notification-connectors.service';
import { NotificationConnectorResponseDto } from './dto/notification-connector-response.dto';
import { UpdateNotificationConnectorDto } from './dto/update-notification-connector.dto';

@Controller('notification-connectors')
@UseGuards(JwtAuthGuard, OrganizationGuard, PermissionsGuard)
@Permissions('notifications.manage')
export class NotificationConnectorsController {
  constructor(private readonly connectorsService: NotificationConnectorsService) {}

  @Get()
  findAll(@CurrentUser() currentUser: CurrentUserType): Promise<NotificationConnectorResponseDto[]> {
    return this.connectorsService.findAll(currentUser);
  }

  @Patch(':code')
  update(
    @Param('code') code: string,
    @Body() dto: UpdateNotificationConnectorDto,
    @CurrentUser() currentUser: CurrentUserType,
    @CurrentOrganization() currentOrganization: CurrentOrganizationType,
    @Req() req: { headers: Record<string, string | string[] | undefined>; ip?: string }
  ): Promise<NotificationConnectorResponseDto> {
    return this.connectorsService.update(code, dto, currentUser, currentOrganization, getRequestMetadata(req));
  }
}

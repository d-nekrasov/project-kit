import { Body, Controller, Get, Param, Put, Query, Req, UseGuards } from '@nestjs/common';
import { getRequestMetadata } from '../../common/utils/request-metadata.util';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser as CurrentUserType } from '../auth/types/current-user.type';
import { CurrentOrganization } from '../organization-context/decorators/current-organization.decorator';
import { OrganizationGuard } from '../organization-context/guards/organization.guard';
import { CurrentOrganization as CurrentOrganizationType } from '../organization-context/types/current-organization.type';
import { Permissions } from '../permissions/decorators/permissions.decorator';
import { PermissionsGuard } from '../permissions/guards/permissions.guard';
import { NotificationTemplateResponseDto } from './dto/notification-template-response.dto';
import { UpdateNotificationTemplateDto } from './dto/update-notification-template.dto';
import { NotificationTemplatesService } from './notification-templates.service';

@Controller('notification-templates')
@UseGuards(JwtAuthGuard, OrganizationGuard, PermissionsGuard)
@Permissions('notifications.manage')
export class NotificationTemplatesController {
  constructor(private readonly templatesService: NotificationTemplatesService) {}

  @Get()
  findAll(
    @Query('search') search: string | undefined,
    @CurrentUser() currentUser: CurrentUserType
  ): Promise<NotificationTemplateResponseDto[]> {
    return this.templatesService.findAll(search, currentUser);
  }

  @Put(':event')
  upsert(
    @Param('event') event: string,
    @Body() dto: UpdateNotificationTemplateDto,
    @CurrentUser() currentUser: CurrentUserType,
    @CurrentOrganization() currentOrganization: CurrentOrganizationType,
    @Req() req: { headers: Record<string, string | string[] | undefined>; ip?: string }
  ): Promise<NotificationTemplateResponseDto> {
    return this.templatesService.upsert(event, dto, currentUser, currentOrganization, getRequestMetadata(req));
  }
}

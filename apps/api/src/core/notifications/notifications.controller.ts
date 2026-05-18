import { Controller, Get, Param, Patch, Query, UseGuards } from '@nestjs/common';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser as CurrentUserType } from '../auth/types/current-user.type';
import { MyNotificationsQueryDto } from './dto/my-notifications-query.dto';
import { NotificationResponseDto } from './dto/notification-response.dto';
import { NotificationsService } from './notifications.service';

@Controller('notifications')
@UseGuards(JwtAuthGuard)
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Get('my')
  findMy(
    @Query() query: MyNotificationsQueryDto,
    @CurrentUser() currentUser: CurrentUserType
  ): Promise<{ items: NotificationResponseDto[]; meta: { page: number; limit: number; total: number; totalPages: number } }> {
    return this.notificationsService.findMy(query, currentUser);
  }

  @Get('my/unread-count')
  unreadCount(@CurrentUser() currentUser: CurrentUserType): Promise<{ count: number }> {
    return this.notificationsService.unreadCount(currentUser);
  }

  @Patch(':id/read')
  markRead(@Param('id') id: string, @CurrentUser() currentUser: CurrentUserType): Promise<NotificationResponseDto> {
    return this.notificationsService.markRead(id, currentUser);
  }

  @Patch('read-all')
  markAllRead(@CurrentUser() currentUser: CurrentUserType): Promise<{ updated: number }> {
    return this.notificationsService.markAllRead(currentUser);
  }
}

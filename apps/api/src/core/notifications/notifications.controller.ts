import { Controller, Get, HttpCode, Param, Patch, Post, Query, Req, Res, UseGuards } from '@nestjs/common';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser as CurrentUserType } from '../auth/types/current-user.type';
import { MyNotificationsQueryDto } from './dto/my-notifications-query.dto';
import { NotificationResponseDto } from './dto/notification-response.dto';
import { NotificationStreamTokenResponseDto } from './dto/notification-stream-token-response.dto';
import { NotificationsRealtimeService } from './notifications-realtime.service';
import { NotificationsService } from './notifications.service';

type NotificationStreamRequest = {
  on(event: 'close', listener: () => void): unknown;
};

type NotificationStreamResponse = {
  status(code: number): unknown;
  setHeader(name: string, value: string): unknown;
  flushHeaders?: () => void;
  write(chunk: string): unknown;
};

@Controller('notifications')
export class NotificationsController {
  constructor(
    private readonly notificationsService: NotificationsService,
    private readonly notificationsRealtimeService: NotificationsRealtimeService
  ) {}

  @Post('stream-token')
  @HttpCode(200)
  @UseGuards(JwtAuthGuard)
  streamToken(@CurrentUser() currentUser: CurrentUserType): Promise<NotificationStreamTokenResponseDto> {
    return this.notificationsService.createStreamToken(currentUser);
  }

  @Get('stream')
  async stream(
    @Query('token') token: string | undefined,
    @Req() request: NotificationStreamRequest,
    @Res() response: NotificationStreamResponse
  ): Promise<void> {
    const { userId } = await this.notificationsService.validateStreamToken(token);

    response.status(200);
    response.setHeader('Content-Type', 'text/event-stream');
    response.setHeader('Cache-Control', 'no-cache, no-transform');
    response.setHeader('Connection', 'keep-alive');
    response.setHeader('X-Accel-Buffering', 'no');
    response.flushHeaders?.();

    const clientId = this.notificationsRealtimeService.addClient(userId, response);
    response.write('event: connected\n');
    response.write('data: {"connected":true}\n\n');

    const keepAlive = setInterval(() => {
      try {
        response.write(': keep-alive\n\n');
      } catch {
        clearInterval(keepAlive);
        this.notificationsRealtimeService.removeClient(userId, clientId);
      }
    }, 25_000);

    request.on('close', () => {
      clearInterval(keepAlive);
      this.notificationsRealtimeService.removeClient(userId, clientId);
    });
  }

  @Get('my')
  @UseGuards(JwtAuthGuard)
  findMy(
    @Query() query: MyNotificationsQueryDto,
    @CurrentUser() currentUser: CurrentUserType
  ): Promise<{ items: NotificationResponseDto[]; meta: { page: number; limit: number; total: number; totalPages: number } }> {
    return this.notificationsService.findMy(query, currentUser);
  }

  @Get('my/unread-count')
  @UseGuards(JwtAuthGuard)
  unreadCount(@CurrentUser() currentUser: CurrentUserType): Promise<{ count: number }> {
    return this.notificationsService.unreadCount(currentUser);
  }

  @Patch(':id/read')
  @UseGuards(JwtAuthGuard)
  markRead(@Param('id') id: string, @CurrentUser() currentUser: CurrentUserType): Promise<NotificationResponseDto> {
    return this.notificationsService.markRead(id, currentUser);
  }

  @Patch('read-all')
  @UseGuards(JwtAuthGuard)
  markAllRead(@CurrentUser() currentUser: CurrentUserType): Promise<{ updated: number }> {
    return this.notificationsService.markAllRead(currentUser);
  }
}

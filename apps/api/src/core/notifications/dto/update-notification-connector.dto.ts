import { NotificationConnectorStatus } from '@prisma/client';
import { IsEnum, IsObject, IsOptional } from 'class-validator';

export class UpdateNotificationConnectorDto {
  @IsOptional()
  @IsEnum(NotificationConnectorStatus)
  status?: NotificationConnectorStatus;

  @IsOptional()
  @IsObject()
  config?: Record<string, unknown>;
}

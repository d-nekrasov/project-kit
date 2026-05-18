import { NotificationChannel } from '@prisma/client';
import { ArrayNotEmpty, ArrayUnique, IsArray, IsEnum, IsOptional, IsString, MinLength } from 'class-validator';

export class UpdateNotificationTemplateDto {
  @IsString()
  @MinLength(1)
  title!: string;

  @IsString()
  @MinLength(1)
  message!: string;

  @IsOptional()
  @IsString()
  emailSubject?: string;

  @IsOptional()
  @IsString()
  emailBody?: string;

  @IsArray()
  @ArrayNotEmpty()
  @ArrayUnique()
  @IsEnum(NotificationChannel, { each: true })
  channels!: NotificationChannel[];
}

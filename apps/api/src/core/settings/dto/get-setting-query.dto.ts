import { SettingScope } from '@prisma/client';
import { IsEnum, IsOptional, IsString } from 'class-validator';

export class GetSettingQueryDto {
  @IsEnum(SettingScope)
  scope!: SettingScope;

  @IsOptional()
  @IsString()
  module?: string;
}

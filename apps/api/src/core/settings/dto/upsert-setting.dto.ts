import { SettingScope } from '@prisma/client';
import { IsBoolean, IsDefined, IsEnum, IsOptional, IsString } from 'class-validator';

export class UpsertSettingDto {
  @IsDefined()
  value!: unknown;

  @IsEnum(SettingScope)
  scope!: SettingScope;

  @IsOptional()
  @IsString()
  module?: string;

  @IsOptional()
  @IsBoolean()
  organizationSpecific?: boolean;
}

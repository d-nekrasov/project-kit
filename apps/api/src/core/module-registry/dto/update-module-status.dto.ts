import { ModuleStatus } from '@prisma/client';
import { IsEnum } from 'class-validator';

export class UpdateModuleStatusDto {
  @IsEnum(ModuleStatus)
  status!: ModuleStatus;
}

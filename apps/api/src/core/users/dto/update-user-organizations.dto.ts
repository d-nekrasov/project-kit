import { Type } from 'class-transformer';
import { IsArray, IsEnum, IsOptional, IsString, ValidateNested } from 'class-validator';
import { UserStatus } from '@prisma/client';

export class UpdateUserOrganizationMembershipDto {
  @IsString()
  organizationId!: string;

  @IsString()
  roleId!: string;

  @IsOptional()
  @IsEnum(UserStatus)
  status?: UserStatus;
}

export class UpdateUserOrganizationsDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => UpdateUserOrganizationMembershipDto)
  organizations!: UpdateUserOrganizationMembershipDto[];
}

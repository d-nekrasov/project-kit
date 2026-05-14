import { Transform } from 'class-transformer';
import { ArrayUnique, IsArray, IsOptional, IsString, Matches, MinLength } from 'class-validator';

export class CreateRoleDto {
  @IsOptional()
  @IsString()
  organizationId?: string;

  @Transform(({ value }) => (typeof value === 'string' ? value.trim().toLowerCase() : value))
  @IsString()
  @MinLength(2)
  @Matches(/^[a-z0-9_-]+$/)
  code!: string;

  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @MinLength(2)
  name!: string;

  @IsOptional()
  @IsArray()
  @ArrayUnique()
  @IsString({ each: true })
  @Matches(/^[a-z0-9_-]+\.[a-z0-9_-]+$/, { each: true })
  permissions?: string[];
}

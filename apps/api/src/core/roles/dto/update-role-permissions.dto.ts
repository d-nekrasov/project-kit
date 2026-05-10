import { ArrayUnique, IsArray, IsString, Matches } from 'class-validator';

export class UpdateRolePermissionsDto {
  @IsArray()
  @ArrayUnique()
  @IsString({ each: true })
  @Matches(/^[a-z0-9_-]+\.[a-z0-9_-]+$/, { each: true })
  permissions!: string[];
}

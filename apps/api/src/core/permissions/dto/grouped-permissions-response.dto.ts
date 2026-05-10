import { PermissionResponseDto } from './permission-response.dto';

export class GroupedPermissionsResponseDto {
  groups!: Array<{
    module: string;
    permissions: PermissionResponseDto[];
  }>;
}

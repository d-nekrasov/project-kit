export class AuthPermissionsResponseDto {
  permissions!: string[];
  systemRoles!: string[];
  organization!: {
    id: string;
    role: string;
  };
}

import { OrganizationStatus, UserStatus } from '@prisma/client';

export class UserResponseDto {
  id!: string;
  email!: string;
  name!: string | null;
  status!: UserStatus;
  organizations!: {
    id: string;
    name: string;
    slug: string;
    status: OrganizationStatus;
    membershipStatus: UserStatus;
    role: string;
    roleId: string;
    roleName: string;
  }[];
  systemRoles!: string[];
  systemRoleDetails!: {
    id: string;
    code: string;
    name: string;
  }[];
  createdAt!: Date;
  updatedAt!: Date;
}

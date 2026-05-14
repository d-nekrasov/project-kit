import type { ISODateString, PaginatedResponse } from './common.types';
import type { OrganizationStatus } from './organizations.types';

export type UserStatus = 'ACTIVE' | 'INACTIVE' | 'BLOCKED';
export type UserOrganizationStatus = UserStatus;

export type UserOrganization = {
  id: string;
  name: string;
  slug: string;
  status: OrganizationStatus;
  membershipStatus: UserOrganizationStatus;
  role: string;
  roleId: string;
  roleName: string;
};

export type UserSystemRole = {
  id: string;
  code: string;
  name: string;
};

export type UserResponse = {
  id: string;
  email: string;
  name: string | null;
  status: UserStatus;
  organizations: UserOrganization[];
  systemRoles: string[];
  systemRoleDetails: UserSystemRole[];
  createdAt: ISODateString;
  updatedAt: ISODateString;
};

export type UsersListQuery = {
  page?: number;
  limit?: number;
  search?: string;
  status?: UserStatus;
};

export type UsersListResponse = PaginatedResponse<UserResponse>;

export type CreateUserDto = {
  email: string;
  name: string;
  password: string;
  roleId: string;
  organizationId?: string;
};

export type UpdateUserDto = {
  name?: string;
  roleId?: string;
  organizationId?: string;
};

export type UpdateMyProfileDto = {
  name?: string;
};

export type UpdateUserStatusDto = {
  status: UserStatus;
};

export type UpdateUserOrganizationsDto = {
  organizations: Array<{
    organizationId: string;
    roleId: string;
    status?: UserOrganizationStatus;
  }>;
};

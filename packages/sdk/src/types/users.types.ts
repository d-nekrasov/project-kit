import type { ISODateString, PaginatedResponse } from './common.types';

export type UserStatus = 'ACTIVE' | 'INACTIVE' | 'BLOCKED';

export type UserOrganization = {
  id: string;
  name: string;
  slug: string;
  role: string;
};

export type UserResponse = {
  id: string;
  email: string;
  name: string;
  status: UserStatus;
  organizations: UserOrganization[];
  systemRoles: string[];
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
};

export type UpdateUserDto = {
  name?: string;
  roleId?: string;
};

export type UpdateUserStatusDto = {
  status: UserStatus;
};

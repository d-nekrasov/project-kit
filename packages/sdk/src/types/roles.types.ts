import type { ISODateString, PaginatedResponse } from './common.types';

export type RoleType = 'SYSTEM' | 'ORGANIZATION';

export type PermissionShort = {
  id: string;
  code: string;
  module: string;
  description: string;
};

export type RoleResponse = {
  id: string;
  code: string;
  name: string;
  type: RoleType;
  organizationId: string | null;
  permissions: PermissionShort[];
  usersCount: number;
  createdAt: ISODateString;
  updatedAt: ISODateString;
};

export type RolesListQuery = {
  page?: number;
  limit?: number;
  search?: string;
  includeSystem?: boolean;
};

export type RolesListResponse = PaginatedResponse<RoleResponse>;

export type CreateRoleDto = {
  code: string;
  name: string;
  permissions?: string[];
};

export type UpdateRoleDto = {
  name?: string;
};

export type UpdateRolePermissionsDto = {
  permissions: string[];
};

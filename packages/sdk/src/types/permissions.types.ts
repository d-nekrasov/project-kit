import type { ISODateString, PaginatedResponse } from './common.types';

export type PermissionResponse = {
  id: string;
  code: string;
  module: string;
  description: string;
  resource: string | null;
  action: string | null;
  createdAt: ISODateString;
  updatedAt: ISODateString;
};

export type PermissionsListQuery = {
  page?: number;
  limit?: number;
  search?: string;
  module?: string;
};

export type PermissionsListResponse = PaginatedResponse<PermissionResponse>;

export type PermissionGroup = {
  module: string;
  permissions: PermissionResponse[];
};

export type GroupedPermissionsResponse = {
  groups: PermissionGroup[];
};

export type PermissionModuleResponse = {
  module: string;
  permissionsCount: number;
};

export type PermissionModulesResponse = {
  items: PermissionModuleResponse[];
};

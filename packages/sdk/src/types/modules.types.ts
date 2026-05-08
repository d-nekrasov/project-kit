import type { ISODateString, PaginatedResponse } from './common.types';

export type ModuleStatus = 'ENABLED' | 'DISABLED';

export type ModuleAdminMenuItem = {
  label: string;
  path: string;
  permission?: string;
  icon?: string;
  order?: number;
};

export type ModuleManifest = {
  name: string;
  title: string;
  version: string;
  description?: string;
  permissions?: string[];
  settingsSchema?: Record<string, unknown>;
  adminMenu?: ModuleAdminMenuItem[];
};

export type ModuleRegistryResponse = {
  id: string;
  name: string;
  title: string;
  version: string;
  description: string | null;
  status: ModuleStatus;
  manifest: ModuleManifest | null;
  installedAt: ISODateString | null;
  createdAt: ISODateString;
  updatedAt: ISODateString;
};

export type ModulesListQuery = {
  page?: number;
  limit?: number;
  search?: string;
  status?: ModuleStatus;
};

export type ModulesListResponse = PaginatedResponse<ModuleRegistryResponse>;

export type UpdateModuleStatusDto = {
  status: ModuleStatus;
};

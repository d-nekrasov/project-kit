import type { PermissionGroup, PermissionModuleResponse, PermissionResponse } from '@project-kit/sdk';

export type PermissionsViewMode = 'table' | 'grouped';

export type PermissionsToolbarProps = {
  search: string;
  onSearchChange: (value: string) => void;
  module: string;
  onModuleChange: (value: string) => void;
  modules: PermissionModuleResponse[];
  viewMode: PermissionsViewMode;
  onViewModeChange: (value: PermissionsViewMode) => void;
  isModulesLoading?: boolean;
};

export type PermissionsTableProps = {
  permissions: PermissionResponse[];
  isLoading?: boolean;
};

export type PermissionsGroupedViewProps = {
  groups: PermissionGroup[];
  isLoading?: boolean;
};

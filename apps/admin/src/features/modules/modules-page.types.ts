import type { ModuleRegistryResponse, ModuleStatus } from '@project-kit/sdk';

export const MODULE_STATUS_FILTERS = ['ALL', 'ENABLED', 'DISABLED'] as const;

export type ModuleStatusFilter = (typeof MODULE_STATUS_FILTERS)[number];

export type ModulesToolbarProps = {
  search: string;
  onSearchChange: (value: string) => void;
  status: ModuleStatusFilter;
  onStatusChange: (value: ModuleStatusFilter) => void;
};

export type ModulesTableProps = {
  modules: ModuleRegistryResponse[];
  isLoading?: boolean;
  isSuperAdmin: boolean;
  onViewManifest: (module: ModuleRegistryResponse) => void;
  onChangeStatus: (module: ModuleRegistryResponse) => void;
};

export type ModuleManifestDialogProps = {
  open: boolean;
  module: ModuleRegistryResponse | null;
  onOpenChange: (open: boolean) => void;
};

export type ModuleStatusDialogProps = {
  open: boolean;
  module: ModuleRegistryResponse | null;
  isSubmitting: boolean;
  error?: string | null;
  onOpenChange: (open: boolean) => void;
  onSubmit: (status: ModuleStatus) => void;
};

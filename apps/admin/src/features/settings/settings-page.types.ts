import type { ModuleRegistryResponse, SettingResponse, SettingScope, UpsertSettingDto } from '@project-kit/sdk';

export const SETTINGS_SCOPE_FILTERS = ['ALL', 'GLOBAL', 'ORGANIZATION', 'MODULE'] as const;

export type SettingsScopeFilter = (typeof SETTINGS_SCOPE_FILTERS)[number];

export type SettingsToolbarProps = {
  search: string;
  onSearchChange: (value: string) => void;
  scope: SettingsScopeFilter;
  onScopeChange: (value: SettingsScopeFilter) => void;
  module: string;
  onModuleChange: (value: string) => void;
  modules: ModuleRegistryResponse[];
  onCreate: () => void;
  onOpenSchema: () => void;
};

export type SettingsTableProps = {
  settings: SettingResponse[];
  isLoading?: boolean;
  onEdit: (setting: SettingResponse) => void;
};

export type SettingScopeBadgeProps = {
  scope: SettingScope;
};

export type SettingFormDialogMode = 'create' | 'edit';

export type SettingFormDialogSubmitValues = {
  key: string;
  scope: SettingScope;
  module?: string;
  organizationSpecific?: boolean;
  value: UpsertSettingDto['value'];
};

export type SettingFormDialogProps = {
  open: boolean;
  mode: SettingFormDialogMode;
  setting?: SettingResponse | null;
  modules: ModuleRegistryResponse[];
  isSuperAdmin: boolean;
  isSubmitting: boolean;
  error?: string | null;
  onOpenChange: (open: boolean) => void;
  onSubmit: (values: SettingFormDialogSubmitValues) => void;
};

export type ModuleSettingsSchemaDialogProps = {
  open: boolean;
  module: ModuleRegistryResponse | null;
  onOpenChange: (open: boolean) => void;
};

export type JsonValueEditorProps = {
  value: string;
  onChange: (value: string) => void;
  error?: string;
};

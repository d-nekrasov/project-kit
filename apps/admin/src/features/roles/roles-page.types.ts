import type { PermissionGroup, RoleResponse } from '@project-kit/sdk';

export type RoleFormValues = {
  code?: string;
  name: string;
};

export type RolesToolbarProps = {
  search: string;
  onSearchChange: (value: string) => void;
  includeSystem: boolean;
  onIncludeSystemChange: (value: boolean) => void;
};

export type RolesTableProps = {
  roles: RoleResponse[];
  isLoading?: boolean;
  onEdit: (role: RoleResponse) => void;
  onEditPermissions: (role: RoleResponse) => void;
};

export type RoleFormDialogProps = {
  open: boolean;
  mode: 'create' | 'edit';
  role?: RoleResponse | null;
  isSubmitting: boolean;
  errorMessage?: string | null;
  onOpenChange: (open: boolean) => void;
  onSubmit: (values: RoleFormValues) => void;
};

export type RolePermissionsDialogProps = {
  open: boolean;
  role: RoleResponse | null;
  permissionGroups: PermissionGroup[];
  isLoading: boolean;
  isSubmitting: boolean;
  errorMessage?: string | null;
  onOpenChange: (open: boolean) => void;
  onSubmit: (permissions: string[]) => void;
};

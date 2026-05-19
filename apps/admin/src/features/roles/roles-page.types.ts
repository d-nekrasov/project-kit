import type { PermissionGroup, RoleResponse } from '@project-kit/sdk';

export type RolesOrganizationOption = {
  id: string;
  name: string;
  slug: string;
};

export type RoleFormValues = {
  code?: string;
  name: string;
};

export type RolesToolbarProps = {
  search: string;
  onSearchChange: (value: string) => void;
  includeSystem: boolean;
  onIncludeSystemChange: (value: boolean) => void;
  isSuperAdmin: boolean;
  organizations: RolesOrganizationOption[];
  selectedOrganizationId: string | null;
  currentOrganizationName?: string | null;
  onSelectedOrganizationIdChange: (id: string) => void;
  isOrganizationsLoading?: boolean;
  organizationsErrorMessage?: string | null;
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
  organizationName?: string | null;
  isSubmitDisabled?: boolean;
  isSubmitting: boolean;
  errorMessage?: string | null;
  onOpenChange: (open: boolean) => void;
  onSubmit: (values: RoleFormValues) => void;
};

export type RolePermissionsDialogProps = {
  open: boolean;
  role: RoleResponse | null;
  organizationName?: string | null;
  permissionGroups: PermissionGroup[];
  isLoading: boolean;
  isSubmitting: boolean;
  errorMessage?: string | null;
  onOpenChange: (open: boolean) => void;
  onSubmit: (permissions: string[]) => void;
};

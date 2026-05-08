import type { RoleResponse, UserResponse, UserStatus } from '@project-kit/sdk';

export const USER_STATUS_FILTERS = ['ALL', 'ACTIVE', 'INACTIVE', 'BLOCKED'] as const;

export type UserStatusFilter = (typeof USER_STATUS_FILTERS)[number];

export type UserFormValues = {
  email?: string;
  name: string;
  password?: string;
  roleId: string;
};

export type UsersToolbarProps = {
  search: string;
  onSearchChange: (value: string) => void;
  status: UserStatusFilter;
  onStatusChange: (value: UserStatusFilter) => void;
};

export type UsersTableProps = {
  users: UserResponse[];
  isLoading?: boolean;
  onEdit: (user: UserResponse) => void;
  onChangeStatus: (user: UserResponse) => void;
};

export type UserFormDialogProps = {
  open: boolean;
  mode: 'create' | 'edit';
  user?: UserResponse | null;
  roles: RoleResponse[];
  isSubmitting: boolean;
  errorMessage?: string | null;
  onOpenChange: (open: boolean) => void;
  onSubmit: (values: UserFormValues) => void;
};

export type UserStatusDialogProps = {
  open: boolean;
  user: UserResponse | null;
  isSubmitting: boolean;
  errorMessage?: string | null;
  onOpenChange: (open: boolean) => void;
  onSubmit: (status: UserStatus) => void;
};

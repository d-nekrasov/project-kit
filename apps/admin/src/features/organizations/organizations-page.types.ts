import type { OrganizationResponse, OrganizationStatus } from '@project-kit/sdk';

export const ORGANIZATION_STATUS_FILTERS = ['ALL', 'ACTIVE', 'INACTIVE'] as const;

export type OrganizationStatusFilter = (typeof ORGANIZATION_STATUS_FILTERS)[number];

export type OrganizationFormValues = {
  name: string;
  slug: string;
};

export type OrganizationsToolbarProps = {
  search: string;
  onSearchChange: (value: string) => void;
  status: OrganizationStatusFilter;
  onStatusChange: (value: OrganizationStatusFilter) => void;
};

export type OrganizationsTableProps = {
  organizations: OrganizationResponse[];
  isLoading?: boolean;
  isSuperAdmin: boolean;
  activeOrganizationId?: string | null;
  onEdit: (organization: OrganizationResponse) => void;
  onChangeStatus: (organization: OrganizationResponse) => void;
};

export type OrganizationFormDialogProps = {
  open: boolean;
  mode: 'create' | 'edit';
  organization?: OrganizationResponse | null;
  isSubmitting: boolean;
  error?: string | null;
  onOpenChange: (open: boolean) => void;
  onSubmit: (values: OrganizationFormValues) => void;
};

export type OrganizationStatusDialogProps = {
  open: boolean;
  organization: OrganizationResponse | null;
  isSubmitting: boolean;
  error?: string | null;
  onOpenChange: (open: boolean) => void;
  onSubmit: (status: OrganizationStatus) => void;
};

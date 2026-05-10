import type { DocumentResponse, DocumentStatus } from '@project-kit/sdk';

export const DOCUMENT_STATUS_FILTERS = ['ALL', 'DRAFT', 'PUBLISHED', 'ARCHIVED'] as const;

export type DocumentStatusFilter = (typeof DOCUMENT_STATUS_FILTERS)[number];

export type DocumentFormValues = {
  title: string;
  content?: string;
};

export type DocumentsToolbarProps = {
  search: string;
  onSearchChange: (value: string) => void;
  status: DocumentStatusFilter;
  onStatusChange: (value: DocumentStatusFilter) => void;
};

export type DocumentsTableProps = {
  documents: DocumentResponse[];
  isLoading?: boolean;
  onEdit: (document: DocumentResponse) => void;
  onChangeStatus: (document: DocumentResponse) => void;
};

export type DocumentFormDialogProps = {
  open: boolean;
  mode: 'create' | 'edit';
  document?: DocumentResponse | null;
  isSubmitting: boolean;
  error?: string | null;
  onOpenChange: (open: boolean) => void;
  onSubmit: (values: DocumentFormValues) => void;
};

export type DocumentStatusDialogProps = {
  open: boolean;
  document: DocumentResponse | null;
  isSubmitting: boolean;
  error?: string | null;
  onOpenChange: (open: boolean) => void;
  onSubmit: (status: DocumentStatus) => void;
};

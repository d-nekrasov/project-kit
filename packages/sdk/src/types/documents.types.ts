import type { ISODateString, PaginatedResponse } from './common.types';

export type DocumentStatus = 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';

export type DocumentUser = {
  id: string;
  email: string;
  name: string;
};

export type DocumentResponse = {
  id: string;
  organizationId: string;
  title: string;
  content: string | null;
  status: DocumentStatus;
  createdBy: DocumentUser;
  updatedBy: DocumentUser | null;
  createdAt: ISODateString;
  updatedAt: ISODateString;
};

export type DocumentsListQuery = {
  page?: number;
  limit?: number;
  search?: string;
  status?: DocumentStatus;
  createdById?: string;
};

export type DocumentsListResponse = PaginatedResponse<DocumentResponse>;

export type CreateDocumentDto = {
  title: string;
  content?: string | null;
};

export type UpdateDocumentDto = {
  title?: string;
  content?: string | null;
};

export type UpdateDocumentStatusDto = {
  status: DocumentStatus;
};

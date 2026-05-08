import type { ISODateString, PaginatedResponse } from './common.types';

export type AuditLogUser = {
  id: string;
  email: string;
  name: string;
};

export type AuditLogOrganization = {
  id: string;
  name: string;
  slug: string;
};

export type AuditLogResponse = {
  id: string;
  userId: string | null;
  organizationId: string | null;
  action: string;
  entityType: string;
  entityId: string | null;
  metadata: unknown;
  ip: string | null;
  userAgent: string | null;
  createdAt: ISODateString;
  user: AuditLogUser | null;
  organization: AuditLogOrganization | null;
};

export type AuditLogsListQuery = {
  page?: number;
  limit?: number;
  userId?: string;
  organizationId?: string;
  action?: string;
  entityType?: string;
  entityId?: string;
  dateFrom?: string;
  dateTo?: string;
  search?: string;
};

export type AuditLogsListResponse = PaginatedResponse<AuditLogResponse>;

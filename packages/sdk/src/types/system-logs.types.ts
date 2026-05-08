import type { ISODateString, PaginatedResponse } from './common.types';

export type SystemLogLevel = 'DEBUG' | 'INFO' | 'WARN' | 'ERROR' | 'FATAL';

export type SystemLogUser = {
  id: string;
  email: string;
  name: string;
};

export type SystemLogOrganization = {
  id: string;
  name: string;
  slug: string;
};

export type SystemLogResponse = {
  id: string;
  level: SystemLogLevel;
  source: string;
  message: string;
  context: unknown;
  errorStack: string | null;
  userId: string | null;
  organizationId: string | null;
  createdAt: ISODateString;
  user: SystemLogUser | null;
  organization: SystemLogOrganization | null;
};

export type SystemLogsListQuery = {
  page?: number;
  limit?: number;
  level?: SystemLogLevel;
  source?: string;
  userId?: string;
  organizationId?: string;
  dateFrom?: string;
  dateTo?: string;
  search?: string;
};

export type SystemLogsListResponse = PaginatedResponse<SystemLogResponse>;

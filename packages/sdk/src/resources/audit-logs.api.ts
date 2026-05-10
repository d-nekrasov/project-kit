import type { ApiClient } from '../client/api-client';
import type { AuditLogResponse, AuditLogsListQuery, AuditLogsListResponse } from '../types/audit-logs.types';

export class AuditLogsApi {
  constructor(private readonly client: ApiClient) {}

  list(query?: AuditLogsListQuery): Promise<AuditLogsListResponse> {
    return this.client.get<AuditLogsListResponse>('/audit-logs', { query });
  }

  getById(id: string): Promise<AuditLogResponse> {
    return this.client.get<AuditLogResponse>(`/audit-logs/${id}`);
  }
}

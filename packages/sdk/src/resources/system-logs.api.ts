import type { ApiClient } from '../client/api-client';
import type { SystemLogResponse, SystemLogsListQuery, SystemLogsListResponse } from '../types/system-logs.types';

export class SystemLogsApi {
  constructor(private readonly client: ApiClient) {}

  list(query?: SystemLogsListQuery): Promise<SystemLogsListResponse> {
    return this.client.get<SystemLogsListResponse>('/system-logs', { query });
  }

  getById(id: string): Promise<SystemLogResponse> {
    return this.client.get<SystemLogResponse>(`/system-logs/${id}`);
  }
}

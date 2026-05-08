import type { ApiClient } from '../client/api-client';
import type {
  GetSettingQuery,
  SettingResponse,
  SettingsListQuery,
  SettingsListResponse,
  UpsertSettingDto
} from '../types/settings.types';

export class SettingsApi {
  constructor(private readonly client: ApiClient) {}

  list(query?: SettingsListQuery): Promise<SettingsListResponse> {
    return this.client.get<SettingsListResponse>('/settings', { query });
  }

  get(key: string, query: GetSettingQuery): Promise<SettingResponse> {
    return this.client.get<SettingResponse>(`/settings/${key}`, { query });
  }

  upsert(key: string, dto: UpsertSettingDto): Promise<SettingResponse> {
    return this.client.put<SettingResponse>(`/settings/${key}`, dto);
  }
}

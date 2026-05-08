import type { ApiClient } from '../client/api-client';
import type {
  GroupedPermissionsResponse,
  PermissionModulesResponse,
  PermissionsListQuery,
  PermissionsListResponse
} from '../types/permissions.types';

export class PermissionsApi {
  constructor(private readonly client: ApiClient) {}

  list(query?: PermissionsListQuery): Promise<PermissionsListResponse> {
    return this.client.get<PermissionsListResponse>('/permissions', { query });
  }

  grouped(query?: Pick<PermissionsListQuery, 'search' | 'module'>): Promise<GroupedPermissionsResponse> {
    return this.client.get<GroupedPermissionsResponse>('/permissions/grouped', { query });
  }

  modules(): Promise<PermissionModulesResponse> {
    return this.client.get<PermissionModulesResponse>('/permissions/modules');
  }
}

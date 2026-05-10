import type { ApiClient } from '../client/api-client';
import type {
  ModuleRegistryResponse,
  ModulesListQuery,
  ModulesListResponse,
  UpdateModuleStatusDto
} from '../types/modules.types';

export class ModulesApi {
  constructor(private readonly client: ApiClient) {}

  list(query?: ModulesListQuery): Promise<ModulesListResponse> {
    return this.client.get<ModulesListResponse>('/modules', { query });
  }

  getByName(name: string): Promise<ModuleRegistryResponse> {
    return this.client.get<ModuleRegistryResponse>(`/modules/${name}`);
  }

  updateStatus(name: string, dto: UpdateModuleStatusDto): Promise<ModuleRegistryResponse> {
    return this.client.patch<ModuleRegistryResponse>(`/modules/${name}/status`, dto);
  }
}

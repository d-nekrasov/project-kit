import type { ApiClient } from '../client/api-client';
import type {
  CreateRoleDto,
  RoleResponse,
  RolesListQuery,
  RolesListResponse,
  UpdateRoleDto,
  UpdateRolePermissionsDto
} from '../types/roles.types';

export class RolesApi {
  constructor(private readonly client: ApiClient) {}

  list(query?: RolesListQuery): Promise<RolesListResponse> {
    return this.client.get<RolesListResponse>('/roles', { query });
  }

  getById(id: string): Promise<RoleResponse> {
    return this.client.get<RoleResponse>(`/roles/${id}`);
  }

  create(dto: CreateRoleDto): Promise<RoleResponse> {
    return this.client.post<RoleResponse>('/roles', dto);
  }

  update(id: string, dto: UpdateRoleDto): Promise<RoleResponse> {
    return this.client.patch<RoleResponse>(`/roles/${id}`, dto);
  }

  updatePermissions(id: string, dto: UpdateRolePermissionsDto): Promise<RoleResponse> {
    return this.client.patch<RoleResponse>(`/roles/${id}/permissions`, dto);
  }
}

import type { ApiClient } from '../client/api-client';
import type {
  CreateUserDto,
  UpdateMyProfileDto,
  UpdateUserOrganizationsDto,
  UpdateUserDto,
  UpdateUserStatusDto,
  UserResponse,
  UsersListQuery,
  UsersListResponse
} from '../types/users.types';

export class UsersApi {
  constructor(private readonly client: ApiClient) {}

  list(query?: UsersListQuery): Promise<UsersListResponse> {
    return this.client.get<UsersListResponse>('/users', { query });
  }

  me(): Promise<UserResponse> {
    return this.client.get<UserResponse>('/users/me');
  }

  updateMe(dto: UpdateMyProfileDto): Promise<UserResponse> {
    return this.client.patch<UserResponse>('/users/me', dto);
  }

  getById(id: string): Promise<UserResponse> {
    return this.client.get<UserResponse>(`/users/${id}`);
  }

  create(dto: CreateUserDto): Promise<UserResponse> {
    return this.client.post<UserResponse>('/users', dto);
  }

  update(id: string, dto: UpdateUserDto): Promise<UserResponse> {
    return this.client.patch<UserResponse>(`/users/${id}`, dto);
  }

  updateStatus(id: string, dto: UpdateUserStatusDto): Promise<UserResponse> {
    return this.client.patch<UserResponse>(`/users/${id}/status`, dto);
  }

  updateOrganizations(id: string, dto: UpdateUserOrganizationsDto): Promise<UserResponse> {
    return this.client.put<UserResponse>(`/users/${id}/organizations`, dto);
  }

  removeOrganization(id: string, organizationId: string): Promise<UserResponse> {
    return this.client.delete<UserResponse>(`/users/${id}/organizations/${organizationId}`);
  }
}

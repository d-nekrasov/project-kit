import type { ApiClient } from '../client/api-client';
import type {
  CreateOrganizationDto,
  OrganizationResponse,
  OrganizationsListQuery,
  OrganizationsListResponse,
  UpdateOrganizationDto,
  UpdateOrganizationStatusDto
} from '../types/organizations.types';

export class OrganizationsApi {
  constructor(private readonly client: ApiClient) {}

  list(query?: OrganizationsListQuery): Promise<OrganizationsListResponse> {
    return this.client.get<OrganizationsListResponse>('/organizations', { query });
  }

  getById(id: string): Promise<OrganizationResponse> {
    return this.client.get<OrganizationResponse>(`/organizations/${id}`);
  }

  create(dto: CreateOrganizationDto): Promise<OrganizationResponse> {
    return this.client.post<OrganizationResponse>('/organizations', dto);
  }

  update(id: string, dto: UpdateOrganizationDto): Promise<OrganizationResponse> {
    return this.client.patch<OrganizationResponse>(`/organizations/${id}`, dto);
  }

  updateStatus(id: string, dto: UpdateOrganizationStatusDto): Promise<OrganizationResponse> {
    return this.client.patch<OrganizationResponse>(`/organizations/${id}/status`, dto);
  }
}

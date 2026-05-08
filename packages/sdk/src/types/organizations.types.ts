import type { ISODateString, PaginatedResponse } from './common.types';

export type OrganizationStatus = 'ACTIVE' | 'INACTIVE';

export type OrganizationResponse = {
  id: string;
  name: string;
  slug: string;
  status: OrganizationStatus;
  usersCount: number;
  rolesCount: number;
  createdAt: ISODateString;
  updatedAt: ISODateString;
};

export type OrganizationsListQuery = {
  page?: number;
  limit?: number;
  search?: string;
  status?: OrganizationStatus;
};

export type OrganizationsListResponse = PaginatedResponse<OrganizationResponse>;

export type CreateOrganizationDto = {
  name: string;
  slug: string;
};

export type UpdateOrganizationDto = {
  name?: string;
  slug?: string;
};

export type UpdateOrganizationStatusDto = {
  status: OrganizationStatus;
};

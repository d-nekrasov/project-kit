import type { ISODateString, PaginatedResponse } from './common.types';

export type SettingScope = 'GLOBAL' | 'ORGANIZATION' | 'MODULE';

export type SettingResponse = {
  id: string;
  key: string;
  value: unknown;
  scope: SettingScope;
  organizationId: string | null;
  module: string | null;
  createdAt: ISODateString;
  updatedAt: ISODateString;
};

export type SettingsListQuery = {
  page?: number;
  limit?: number;
  search?: string;
  scope?: SettingScope;
  module?: string;
};

export type SettingsListResponse = PaginatedResponse<SettingResponse>;

export type GetSettingQuery = {
  scope: SettingScope;
  module?: string;
};

export type UpsertSettingDto = {
  value: unknown;
  scope: SettingScope;
  module?: string | null;
  organizationSpecific?: boolean;
};

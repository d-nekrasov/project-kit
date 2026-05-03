import { SettingScope } from '@prisma/client';

export class SettingResponseDto {
  id!: string;
  key!: string;
  value!: unknown;
  scope!: SettingScope;
  organizationId!: string | null;
  module!: string | null;
  createdAt!: Date;
  updatedAt!: Date;
}

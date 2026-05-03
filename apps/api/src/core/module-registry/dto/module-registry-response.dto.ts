import { ModuleStatus } from '@prisma/client';

export class ModuleRegistryResponseDto {
  id!: string;
  name!: string;
  title!: string;
  version!: string;
  description!: string | null;
  status!: ModuleStatus;
  manifest!: Record<string, unknown> | null;
  installedAt!: Date | null;
  createdAt!: Date;
  updatedAt!: Date;
}

import { OrganizationStatus } from '@prisma/client';

export class OrganizationResponseDto {
  id!: string;
  name!: string;
  slug!: string;
  status!: OrganizationStatus;
  usersCount!: number;
  rolesCount!: number;
  createdAt!: Date;
  updatedAt!: Date;
}

import { RoleType } from '@prisma/client';

export class RoleResponseDto {
  id!: string;
  code!: string;
  name!: string;
  type!: RoleType;
  organizationId!: string | null;
  permissions!: {
    id: string;
    code: string;
    module: string;
    description: string | null;
  }[];
  usersCount!: number;
  createdAt!: Date;
  updatedAt!: Date;
}

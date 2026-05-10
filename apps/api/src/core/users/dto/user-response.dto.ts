import { UserStatus } from '@prisma/client';

export class UserResponseDto {
  id!: string;
  email!: string;
  name!: string | null;
  status!: UserStatus;
  organizations!: {
    id: string;
    name: string;
    slug: string;
    role: string;
  }[];
  systemRoles!: string[];
  createdAt!: Date;
  updatedAt!: Date;
}

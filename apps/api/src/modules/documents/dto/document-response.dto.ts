import { DocumentStatus } from '@prisma/client';

type DocumentUserDto = {
  id: string;
  email: string;
  name: string | null;
};

export class DocumentResponseDto {
  id!: string;
  organizationId!: string;
  title!: string;
  content!: string | null;
  status!: DocumentStatus;
  createdBy!: DocumentUserDto;
  updatedBy!: DocumentUserDto | null;
  createdAt!: Date;
  updatedAt!: Date;
}

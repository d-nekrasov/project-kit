import { DocumentStatus } from '@prisma/client';
import { IsEnum } from 'class-validator';

export class UpdateDocumentStatusDto {
  @IsEnum(DocumentStatus)
  status!: DocumentStatus;
}

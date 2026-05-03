export class PermissionResponseDto {
  id!: string;
  code!: string;
  module!: string;
  description!: string | null;
  resource!: string | null;
  action!: string | null;
  createdAt!: Date;
  updatedAt!: Date;
}

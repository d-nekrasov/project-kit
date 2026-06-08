import { IsEmail, IsIn, IsNotEmpty, IsOptional, Matches, MinLength } from 'class-validator';

export class SetupInstallerDto {
  @IsNotEmpty()
  @MinLength(2)
  appName!: string;

  @IsNotEmpty()
  @MinLength(2)
  organizationName!: string;

  @IsNotEmpty()
  @MinLength(2)
  @Matches(/^[a-z0-9-]+$/)
  organizationSlug!: string;

  @IsEmail()
  adminEmail!: string;

  @IsNotEmpty()
  @MinLength(8)
  adminPassword!: string;

  @IsNotEmpty()
  @MinLength(2)
  adminName!: string;

  @IsOptional()
  @IsIn(['ru', 'en'])
  locale?: 'ru' | 'en';
}

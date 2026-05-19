import { Body, Controller, Get, Post, Req, UseGuards } from '@nestjs/common';
import { getRequestMetadata } from '../../common/utils/request-metadata.util';
import { AuthService } from './auth.service';
import { CurrentUser } from './decorators/current-user.decorator';
import { AuthPermissionsResponseDto } from './dto/auth-permissions-response.dto';
import { AuthResponseDto } from './dto/auth-response.dto';
import { LoginDto } from './dto/login.dto';
import { MeResponseDto } from './dto/me-response.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { CurrentUser as CurrentUserType } from './types/current-user.type';
import { CurrentOrganization } from '../organization-context/decorators/current-organization.decorator';
import { OrganizationGuard } from '../organization-context/guards/organization.guard';
import { CurrentOrganization as CurrentOrganizationType } from '../organization-context/types/current-organization.type';
import { Permissions } from '../permissions/decorators/permissions.decorator';
import { PermissionsGuard } from '../permissions/guards/permissions.guard';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  login(@Body() dto: LoginDto, @Req() req: { headers: Record<string, string | string[] | undefined>; ip?: string }): Promise<AuthResponseDto> {
    return this.authService.login(dto, getRequestMetadata(req));
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  me(@CurrentUser() user: CurrentUserType): MeResponseDto {
    return user;
  }

  @Get('permissions')
  @UseGuards(JwtAuthGuard, OrganizationGuard)
  permissions(
    @CurrentUser() user: CurrentUserType,
    @CurrentOrganization() organization: CurrentOrganizationType
  ): Promise<AuthPermissionsResponseDto> {
    return this.authService.getEffectivePermissions(user, organization);
  }

  // TODO: remove or move to diagnostics controller.
  @Get('context')
  @UseGuards(JwtAuthGuard, OrganizationGuard)
  context(
    @CurrentUser('id') userId: string,
    @CurrentOrganization() organization: CurrentOrganizationType
  ): { userId: string; organization: CurrentOrganizationType } {
    return { userId, organization };
  }

  // TODO: remove or move to diagnostics controller
  @Get('permissions-check')
  @UseGuards(JwtAuthGuard, OrganizationGuard, PermissionsGuard)
  @Permissions('users.read')
  permissionsCheck(): { allowed: boolean; permission: string } {
    return { allowed: true, permission: 'users.read' };
  }
}

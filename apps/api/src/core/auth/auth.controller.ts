import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { AuthService } from './auth.service';
import { CurrentUser } from './decorators/current-user.decorator';
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
  login(@Body() dto: LoginDto): Promise<AuthResponseDto> {
    return this.authService.login(dto);
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  me(@CurrentUser() user: CurrentUserType): MeResponseDto {
    return user;
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

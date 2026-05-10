import { Body, Controller, Get, Param, Patch, Post, Query, Req, UseGuards } from '@nestjs/common';
import { getRequestMetadata } from '../../common/utils/request-metadata.util';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser as CurrentUserType } from '../auth/types/current-user.type';
import { CurrentOrganization } from '../organization-context/decorators/current-organization.decorator';
import { OrganizationGuard } from '../organization-context/guards/organization.guard';
import { CurrentOrganization as CurrentOrganizationType } from '../organization-context/types/current-organization.type';
import { Permissions } from '../permissions/decorators/permissions.decorator';
import { PermissionsGuard } from '../permissions/guards/permissions.guard';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserStatusDto } from './dto/update-user-status.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UserResponseDto } from './dto/user-response.dto';
import { UsersListQueryDto } from './dto/users-list-query.dto';
import { UsersService } from './users.service';

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  @UseGuards(JwtAuthGuard, OrganizationGuard, PermissionsGuard)
  @Permissions('users.read')
  findAll(
    @CurrentOrganization() organization: CurrentOrganizationType,
    @Query() query: UsersListQueryDto
  ): Promise<{
    items: UserResponseDto[];
    meta: { page: number; limit: number; total: number; totalPages: number };
  }> {
    return this.usersService.findAll(organization.id, query);
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard, OrganizationGuard, PermissionsGuard)
  @Permissions('users.read')
  findById(
    @CurrentOrganization() organization: CurrentOrganizationType,
    @Param('id') userId: string
  ): Promise<UserResponseDto> {
    return this.usersService.findByIdInOrganization(userId, organization.id);
  }

  @Post()
  @UseGuards(JwtAuthGuard, OrganizationGuard, PermissionsGuard)
  @Permissions('users.create')
  create(
    @CurrentUser() currentUser: CurrentUserType,
    @CurrentOrganization() organization: CurrentOrganizationType,
    @Body() dto: CreateUserDto,
    @Req() req: { headers: Record<string, string | string[] | undefined>; ip?: string }
  ): Promise<UserResponseDto> {
    return this.usersService.create(organization.id, currentUser, dto, getRequestMetadata(req));
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, OrganizationGuard, PermissionsGuard)
  @Permissions('users.update')
  update(
    @CurrentUser() currentUser: CurrentUserType,
    @CurrentOrganization() organization: CurrentOrganizationType,
    @Param('id') userId: string,
    @Body() dto: UpdateUserDto,
    @Req() req: { headers: Record<string, string | string[] | undefined>; ip?: string }
  ): Promise<UserResponseDto> {
    return this.usersService.update(userId, currentUser, organization.id, dto, getRequestMetadata(req));
  }

  @Patch(':id/status')
  @UseGuards(JwtAuthGuard, OrganizationGuard, PermissionsGuard)
  @Permissions('users.delete')
  updateStatus(
    @CurrentUser() currentUser: CurrentUserType,
    @CurrentOrganization() organization: CurrentOrganizationType,
    @Param('id') userId: string,
    @Body() dto: UpdateUserStatusDto,
    @Req() req: { headers: Record<string, string | string[] | undefined>; ip?: string }
  ): Promise<UserResponseDto> {
    return this.usersService.updateStatus(userId, currentUser, organization.id, dto.status, getRequestMetadata(req));
  }
}

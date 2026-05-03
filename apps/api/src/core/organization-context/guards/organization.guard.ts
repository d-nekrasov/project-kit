import {
  BadRequestException,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException
} from '@nestjs/common';
import { OrganizationStatus } from '@prisma/client';
import { PrismaService } from '../../../infrastructure/prisma/prisma.service';
import { CurrentUser } from '../../auth/types/current-user.type';
import { ORGANIZATION_ID_HEADER } from '../constants/organization-header.constants';
import { CurrentOrganization } from '../types/current-organization.type';

type OrganizationRequest = {
  headers: Record<string, string | string[] | undefined>;
  user?: CurrentUser;
  organization?: CurrentOrganization;
};

@Injectable()
export class OrganizationGuard implements CanActivate {
  constructor(private readonly prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<OrganizationRequest>();
    const user = request.user;

    if (!user) {
      throw new UnauthorizedException();
    }

    const organizationIdHeader = request.headers[ORGANIZATION_ID_HEADER];
    if (!organizationIdHeader) {
      throw new BadRequestException('Organization header is required');
    }
    if (typeof organizationIdHeader !== 'string') {
      throw new BadRequestException('Organization header is required');
    }

    const matchedOrganization = user.organizations.find(
      (organization) => organization.id === organizationIdHeader
    );
    if (matchedOrganization) {
      request.organization = matchedOrganization;
      return true;
    }

    const isSuperAdmin = user.systemRoles.includes('super_admin');
    if (!isSuperAdmin) {
      throw new ForbiddenException('You do not have access to this organization');
    }

    const organization = await this.prisma.organization.findUnique({
      where: { id: organizationIdHeader },
      select: {
        id: true,
        name: true,
        slug: true,
        status: true
      }
    });

    if (!organization || organization.status !== OrganizationStatus.ACTIVE) {
      throw new ForbiddenException('You do not have access to this organization');
    }

    request.organization = {
      id: organization.id,
      name: organization.name,
      slug: organization.slug,
      role: 'super_admin'
    };

    return true;
  }
}

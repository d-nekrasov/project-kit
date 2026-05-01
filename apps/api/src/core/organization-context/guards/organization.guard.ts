import {
  BadRequestException,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException
} from '@nestjs/common';
import { CurrentOrganization } from '../types/current-organization.type';
import { CurrentUser } from '../../auth/types/current-user.type';
import { ORGANIZATION_ID_HEADER } from '../constants/organization-header.constants';

type OrganizationRequest = {
  headers: Record<string, string | string[] | undefined>;
  user?: CurrentUser;
  organization?: CurrentOrganization;
};

@Injectable()
export class OrganizationGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
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
    if (!matchedOrganization) {
      throw new ForbiddenException('You do not have access to this organization');
    }

    request.organization = matchedOrganization;
    return true;
  }
}

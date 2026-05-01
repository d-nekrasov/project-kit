import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { CurrentOrganization } from '../types/current-organization.type';

export const CurrentOrganizationDecorator = createParamDecorator(
  (field: keyof CurrentOrganization | undefined, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest<{ organization?: CurrentOrganization }>();
    const organization = request.organization;

    if (!field) {
      return organization;
    }
    return organization?.[field];
  }
);

export { CurrentOrganizationDecorator as CurrentOrganization };

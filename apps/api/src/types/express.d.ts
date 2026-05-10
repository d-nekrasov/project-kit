import { CurrentUser } from '../core/auth/types/current-user.type';
import { CurrentOrganization } from '../core/organization-context/types/current-organization.type';

declare global {
  namespace Express {
    interface Request {
      user?: CurrentUser;
      organization?: CurrentOrganization;
    }
  }
}

export {};

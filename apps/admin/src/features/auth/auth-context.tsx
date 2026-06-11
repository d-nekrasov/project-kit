import { createContext } from 'react';

import type { CurrentUser } from '@project-kit/sdk';

export type AuthState = {
  user: CurrentUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  permissions: string[];
  isPermissionsLoading: boolean;
  activeOrganizationId: string | null;
};

export type AuthContextValue = AuthState & {
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshMe: () => Promise<void>;
  refreshPermissions: () => Promise<void>;
  setActiveOrganization: (id: string) => Promise<void>;
  hasSystemRole: (role: string) => boolean;
  hasOrganizationRole: (role: string) => boolean;
  hasPermission: (permission: string) => boolean;
  hasAnyPermission: (permissions: string[]) => boolean;
  hasAllPermissions: (permissions: string[]) => boolean;
};

export const AuthContext = createContext<AuthContextValue | null>(null);

import { createContext } from 'react';

import type { CurrentUser } from '@project-kit/sdk';

export type AuthState = {
  user: CurrentUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  activeOrganizationId: string | null;
};

export type AuthContextValue = AuthState & {
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  refreshMe: () => Promise<void>;
  setActiveOrganization: (id: string) => void;
  hasSystemRole: (role: string) => boolean;
  hasOrganizationRole: (role: string) => boolean;
};

export const AuthContext = createContext<AuthContextValue | null>(null);

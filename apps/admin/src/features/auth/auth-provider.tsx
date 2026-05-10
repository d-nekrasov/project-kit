import { useCallback, useEffect, useMemo, useState, type PropsWithChildren } from 'react';

import type { CurrentUser } from '@project-kit/sdk';

import { AuthContext, type AuthContextValue } from '@/features/auth/auth-context';
import {
  clearActiveOrganizationId,
  clearAuthStorage,
  getAccessToken,
  getActiveOrganizationId,
  setAccessToken,
  setActiveOrganizationId
} from '@/features/auth/auth-storage';
import { sdk } from '@/lib/sdk';

function resolveOrganization(user: CurrentUser, savedOrganizationId: string | null): string | null {
  if (!user.organizations.length) {
    return null;
  }

  if (savedOrganizationId && user.organizations.some((item) => item.id === savedOrganizationId)) {
    return savedOrganizationId;
  }

  return user.organizations[0].id;
}

export function AuthProvider({ children }: PropsWithChildren) {
  const [user, setUser] = useState<CurrentUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeOrganizationId, setActiveOrganizationIdState] = useState<string | null>(
    getActiveOrganizationId()
  );

  const refreshMe = useCallback(async () => {
    const token = getAccessToken();
    if (!token) {
      setUser(null);
      setActiveOrganizationIdState(null);
      setIsLoading(false);
      return;
    }

    try {
      const nextUser = await sdk.auth.me();
      const nextOrgId = resolveOrganization(nextUser, getActiveOrganizationId());

      if (nextOrgId) {
        setActiveOrganizationId(nextOrgId);
      } else {
        clearActiveOrganizationId();
      }

      setUser(nextUser);
      setActiveOrganizationIdState(nextOrgId);
    } catch {
      clearAuthStorage();
      setUser(null);
      setActiveOrganizationIdState(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void refreshMe();
  }, [refreshMe]);

  const login = useCallback(async (email: string, password: string) => {
    const result = await sdk.auth.login({ email, password });
    setAccessToken(result.accessToken);

    const orgId = resolveOrganization(result.user, getActiveOrganizationId());
    if (orgId) {
      setActiveOrganizationId(orgId);
    } else {
      clearActiveOrganizationId();
    }

    setUser(result.user);
    setActiveOrganizationIdState(orgId);
  }, []);

  const logout = useCallback(() => {
    clearAuthStorage();
    setUser(null);
    setActiveOrganizationIdState(null);
  }, []);

  const setActiveOrganization = useCallback((id: string) => {
    setActiveOrganizationId(id);
    setActiveOrganizationIdState(id);
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      isLoading,
      isAuthenticated: Boolean(user && getAccessToken()),
      activeOrganizationId,
      login,
      logout,
      refreshMe,
      setActiveOrganization,
      hasSystemRole: (role: string) => Boolean(user?.systemRoles.includes(role)),
      hasOrganizationRole: (role: string) =>
        Boolean(user?.organizations.find((item) => item.id === activeOrganizationId)?.role === role)
    }),
    [activeOrganizationId, isLoading, login, logout, refreshMe, setActiveOrganization, user]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

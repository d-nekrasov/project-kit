import { useCallback, useEffect, useMemo, useState, type PropsWithChildren } from 'react';

import type { CurrentUser } from '@project-kit/sdk';
import { useQueryClient } from '@tanstack/react-query';

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
  const queryClient = useQueryClient();
  const [user, setUser] = useState<CurrentUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [permissions, setPermissions] = useState<string[]>([]);
  const [isPermissionsLoading, setIsPermissionsLoading] = useState(false);
  const [activeOrganizationId, setActiveOrganizationIdState] = useState<string | null>(
    getActiveOrganizationId()
  );

  const refreshPermissions = useCallback(async () => {
    const token = getAccessToken();
    const organizationId = getActiveOrganizationId();

    if (!token || !organizationId) {
      setPermissions([]);
      setIsPermissionsLoading(false);
      return;
    }

    setIsPermissionsLoading(true);
    try {
      const response = await sdk.auth.permissions();
      setPermissions(response.permissions);
    } catch {
      setPermissions([]);
    } finally {
      setIsPermissionsLoading(false);
    }
  }, []);

  const refreshMe = useCallback(async () => {
    const token = getAccessToken();
    if (!token) {
      setUser(null);
      setActiveOrganizationIdState(null);
      setPermissions([]);
      setIsPermissionsLoading(false);
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
      await refreshPermissions();
    } catch {
      clearAuthStorage();
      queryClient.clear();
      setUser(null);
      setActiveOrganizationIdState(null);
      setPermissions([]);
      setIsPermissionsLoading(false);
    } finally {
      setIsLoading(false);
    }
  }, [queryClient, refreshPermissions]);

  useEffect(() => {
    void refreshMe();
  }, [refreshMe]);

  const login = useCallback(
    async (email: string, password: string) => {
      queryClient.clear();
      setPermissions([]);
      setIsPermissionsLoading(true);

      try {
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
        await refreshPermissions();
      } catch (error) {
        setIsPermissionsLoading(false);
        throw error;
      }
    },
    [queryClient, refreshPermissions]
  );

  const logout = useCallback(() => {
    queryClient.clear();
    clearAuthStorage();
    setUser(null);
    setActiveOrganizationIdState(null);
    setPermissions([]);
    setIsPermissionsLoading(false);
  }, [queryClient]);

  const setActiveOrganization = useCallback(
    async (id: string) => {
      queryClient.clear();
      setPermissions([]);
      setIsPermissionsLoading(true);
      setActiveOrganizationId(id);
      setActiveOrganizationIdState(id);
      await refreshPermissions();
    },
    [queryClient, refreshPermissions]
  );

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      isLoading,
      isAuthenticated: Boolean(user && getAccessToken()),
      permissions,
      isPermissionsLoading,
      activeOrganizationId,
      login,
      logout,
      refreshMe,
      refreshPermissions,
      setActiveOrganization,
      hasSystemRole: (role: string) => Boolean(user?.systemRoles.includes(role)),
      hasOrganizationRole: (role: string) =>
        Boolean(user?.organizations.find((item) => item.id === activeOrganizationId)?.role === role),
      hasPermission: (permission: string) => permissions.includes(permission),
      hasAnyPermission: (requiredPermissions: string[]) =>
        requiredPermissions.some((permission) => permissions.includes(permission)),
      hasAllPermissions: (requiredPermissions: string[]) =>
        requiredPermissions.every((permission) => permissions.includes(permission))
    }),
    [
      activeOrganizationId,
      isLoading,
      isPermissionsLoading,
      login,
      logout,
      permissions,
      refreshMe,
      refreshPermissions,
      setActiveOrganization,
      user
    ]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

const LEGACY_ACCESS_TOKEN_KEY = 'project_kit_access_token';
const ACTIVE_ORGANIZATION_ID_KEY = 'project_kit_active_organization_id';
const RECENT_LOGOUT_KEY = 'project_kit_recent_logout';

export function getActiveOrganizationId(): string | null {
  return localStorage.getItem(ACTIVE_ORGANIZATION_ID_KEY);
}

export function setActiveOrganizationId(id: string): void {
  localStorage.setItem(ACTIVE_ORGANIZATION_ID_KEY, id);
}

export function clearActiveOrganizationId(): void {
  localStorage.removeItem(ACTIVE_ORGANIZATION_ID_KEY);
}

export function clearAuthStorage(): void {
  localStorage.removeItem(LEGACY_ACCESS_TOKEN_KEY);
  clearActiveOrganizationId();
}

export function removeLegacyAccessToken(): void {
  localStorage.removeItem(LEGACY_ACCESS_TOKEN_KEY);
}

export function markRecentLogout(): void {
  if (typeof sessionStorage === 'undefined') {
    return;
  }

  sessionStorage.setItem(RECENT_LOGOUT_KEY, '1');
}

export function clearRecentLogout(): void {
  if (typeof sessionStorage === 'undefined') {
    return;
  }

  sessionStorage.removeItem(RECENT_LOGOUT_KEY);
}

export function consumeRecentLogout(): boolean {
  if (typeof sessionStorage === 'undefined') {
    return false;
  }

  const hasRecentLogout = sessionStorage.getItem(RECENT_LOGOUT_KEY) === '1';
  if (hasRecentLogout) {
    sessionStorage.removeItem(RECENT_LOGOUT_KEY);
  }

  return hasRecentLogout;
}

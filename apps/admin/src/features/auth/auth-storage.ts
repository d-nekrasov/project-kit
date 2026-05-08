const ACCESS_TOKEN_KEY = 'project_kit_access_token';
const ACTIVE_ORGANIZATION_ID_KEY = 'project_kit_active_organization_id';

export function getAccessToken(): string | null {
  return localStorage.getItem(ACCESS_TOKEN_KEY);
}

export function setAccessToken(token: string): void {
  localStorage.setItem(ACCESS_TOKEN_KEY, token);
}

export function clearAccessToken(): void {
  localStorage.removeItem(ACCESS_TOKEN_KEY);
}

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
  clearAccessToken();
  clearActiveOrganizationId();
}

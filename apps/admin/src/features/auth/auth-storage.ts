const LEGACY_ACCESS_TOKEN_KEY = 'project_kit_access_token';
const ACTIVE_ORGANIZATION_ID_KEY = 'project_kit_active_organization_id';

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

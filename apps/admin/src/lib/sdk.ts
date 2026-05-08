import { createProjectKitSdk } from '@project-kit/sdk';

import { clearAuthStorage, getAccessToken, getActiveOrganizationId } from '@/features/auth/auth-storage';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

export const sdk = createProjectKitSdk({
  baseUrl: API_URL,
  getAccessToken,
  getOrganizationId: getActiveOrganizationId,
  onUnauthorized: () => {
    clearAuthStorage();
    window.location.href = '/login';
  }
});

import { createProjectKitSdk } from '@project-kit/sdk';

import { clearAuthStorage, getActiveOrganizationId } from '@/features/auth/auth-storage';
import { shouldRedirectToLogin } from '@/lib/auth-redirect';
import { queryClient } from '@/lib/query-client';

export const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

export const sdk = createProjectKitSdk({
  baseUrl: API_BASE_URL,
  csrf: {
    endpoint: '/auth/csrf'
  },
  getOrganizationId: getActiveOrganizationId,
  onUnauthorized: () => {
    queryClient.clear();
    clearAuthStorage();

    if (!shouldRedirectToLogin(window.location.pathname)) {
      return;
    }

    window.location.replace('/login');
  }
});

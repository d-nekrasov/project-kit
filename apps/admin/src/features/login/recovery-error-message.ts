import { ApiError } from '@project-kit/sdk';

import { getApiErrorMessage } from '@/lib/api-error-message';

type Translate = (key: string, params?: Record<string, string | number | boolean | null | undefined>) => string;

export function getRecoveryErrorMessage(error: unknown, t: Translate): string {
  if (error instanceof ApiError && error.status === 0) {
    return import.meta.env.DEV ? error.message : t('auth.apiUnavailable');
  }

  if (error instanceof ApiError && error.status === 400) {
    return t('auth.resetPassword.tokenInvalidOrExpired');
  }

  return getApiErrorMessage(error);
}

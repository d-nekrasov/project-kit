import { ApiError } from '@project-kit/sdk';

import { getApiErrorMessage } from '@/lib/api-error-message';

const INVALID_TOKEN_MESSAGE = 'Password reset token is invalid or expired';

export function getRecoveryErrorMessage(error: unknown): string {
  if (error instanceof ApiError && error.status === 0) {
    return import.meta.env.DEV ? error.message : 'Unable to connect to API. Check that backend is running.';
  }

  if (error instanceof ApiError && error.status === 400) {
    return INVALID_TOKEN_MESSAGE;
  }

  return getApiErrorMessage(error);
}

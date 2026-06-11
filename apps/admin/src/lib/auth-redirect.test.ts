import assert from 'node:assert/strict';
import { test } from 'node:test';

import { shouldRedirectToLogin } from '@/lib/auth-redirect';

test('public auth pages do not trigger login redirect', () => {
  assert.equal(shouldRedirectToLogin('/login'), false);
  assert.equal(shouldRedirectToLogin('/forgot-password'), false);
  assert.equal(shouldRedirectToLogin('/reset-password'), false);
  assert.equal(shouldRedirectToLogin('/install'), false);
});

test('protected pages still redirect to login on unauthorized', () => {
  assert.equal(shouldRedirectToLogin('/'), true);
  assert.equal(shouldRedirectToLogin('/users'), true);
});

import assert from 'node:assert/strict';
import { test } from 'node:test';

import { createProjectKitSdk } from '@project-kit/sdk';

test('SDK sends credentials for cookie auth requests', async () => {
  let capturedCredentials: RequestCredentials | undefined;

  const sdk = createProjectKitSdk({
    baseUrl: 'http://localhost:3000/api',
    fetchImpl: async (_input, init) => {
      capturedCredentials = init?.credentials;
      return new Response(JSON.stringify({ success: true }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    }
  });

  await sdk.auth.logout();

  assert.equal(capturedCredentials, 'include');
});

test('skipAuth requests do not trigger unauthorized handler', async () => {
  let unauthorizedCalls = 0;

  const sdk = createProjectKitSdk({
    baseUrl: 'http://localhost:3000/api',
    onUnauthorized: () => {
      unauthorizedCalls += 1;
    },
    fetchImpl: async () =>
      new Response(JSON.stringify({ message: 'Invalid email or password' }), {
        status: 401,
        statusText: 'Unauthorized',
        headers: { 'Content-Type': 'application/json' }
      })
  });

  await assert.rejects(() =>
    sdk.auth.login({
      email: 'admin@example.com',
      password: 'wrong-password'
    })
  );

  assert.equal(unauthorizedCalls, 0);
});

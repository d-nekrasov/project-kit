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

test('SDK fetches CSRF token before mutating cookie-auth requests and sends the header', async () => {
  const calls: Array<{ url: string; method: string; csrfHeader: string | null }> = [];

  const sdk = createProjectKitSdk({
    baseUrl: 'http://localhost:3000/api',
    csrf: {
      endpoint: '/auth/csrf'
    },
    fetchImpl: async (input, init) => {
      const url = String(input);
      const method = init?.method ?? 'GET';
      const headers = new Headers(init?.headers);
      calls.push({
        url,
        method,
        csrfHeader: headers.get('X-CSRF-Token')
      });

      if (url.endsWith('/auth/csrf')) {
        return new Response(
          JSON.stringify({
            csrfToken: 'csrf-token-1',
            headerName: 'X-CSRF-Token',
            cookieName: 'XSRF-TOKEN'
          }),
          {
            status: 200,
            headers: { 'Content-Type': 'application/json' }
          }
        );
      }

      return new Response(JSON.stringify({ success: true }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    }
  });

  await sdk.auth.logout();

  assert.equal(calls.length, 2);
  assert.equal(calls[0]?.url, 'http://localhost:3000/api/auth/csrf');
  assert.equal(calls[0]?.method, 'GET');
  assert.equal(calls[1]?.url, 'http://localhost:3000/api/auth/logout');
  assert.equal(calls[1]?.method, 'POST');
  assert.equal(calls[1]?.csrfHeader, 'csrf-token-1');
});

test('SDK retries a mutating request once after a CSRF 403 by refreshing the token', async () => {
  let logoutAttempts = 0;
  let csrfCalls = 0;

  const sdk = createProjectKitSdk({
    baseUrl: 'http://localhost:3000/api',
    csrf: {
      endpoint: '/auth/csrf'
    },
    fetchImpl: async (input, init) => {
      const url = String(input);
      const headers = new Headers(init?.headers);

      if (url.endsWith('/auth/csrf')) {
        csrfCalls += 1;
        return new Response(
          JSON.stringify({
            csrfToken: `csrf-token-${csrfCalls}`,
            headerName: 'X-CSRF-Token',
            cookieName: 'XSRF-TOKEN'
          }),
          {
            status: 200,
            headers: { 'Content-Type': 'application/json' }
          }
        );
      }

      logoutAttempts += 1;
      if (logoutAttempts === 1) {
        assert.equal(headers.get('X-CSRF-Token'), 'csrf-token-1');
        return new Response(JSON.stringify({ message: 'Invalid CSRF token' }), {
          status: 403,
          statusText: 'Forbidden',
          headers: { 'Content-Type': 'application/json' }
        });
      }

      assert.equal(headers.get('X-CSRF-Token'), 'csrf-token-2');
      return new Response(JSON.stringify({ success: true }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    }
  });

  await sdk.auth.logout();

  assert.equal(csrfCalls, 2);
  assert.equal(logoutAttempts, 2);
});

test('SDK reuses a single CSRF fetch for concurrent mutating requests', async () => {
  const calls: Array<{ url: string; method: string; csrfHeader: string | null }> = [];
  let csrfCalls = 0;
  let releaseCsrfFetch: (() => void) | null = null;
  const csrfFetchBlocked = new Promise<void>((resolve) => {
    releaseCsrfFetch = resolve;
  });

  const sdk = createProjectKitSdk({
    baseUrl: 'http://localhost:3000/api',
    csrf: {
      endpoint: '/auth/csrf'
    },
    fetchImpl: async (input, init) => {
      const url = String(input);
      const method = init?.method ?? 'GET';
      const headers = new Headers(init?.headers);

      calls.push({
        url,
        method,
        csrfHeader: headers.get('X-CSRF-Token')
      });

      if (url.endsWith('/auth/csrf')) {
        csrfCalls += 1;
        await csrfFetchBlocked;

        return new Response(
          JSON.stringify({
            csrfToken: 'shared-csrf-token',
            headerName: 'X-CSRF-Token',
            cookieName: 'XSRF-TOKEN'
          }),
          {
            status: 200,
            headers: { 'Content-Type': 'application/json' }
          }
        );
      }

      return new Response(JSON.stringify({ success: true }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    }
  });

  const firstRequest = sdk.client.post<{ success: true }>('/concurrent-a');
  const secondRequest = sdk.client.post<{ success: true }>('/concurrent-b');

  await new Promise((resolve) => setTimeout(resolve, 0));

  assert.equal(csrfCalls, 1);
  releaseCsrfFetch?.();

  await Promise.all([firstRequest, secondRequest]);

  assert.equal(csrfCalls, 1);
  assert.equal(
    calls.filter((call) => call.url.endsWith('/auth/csrf')).length,
    1
  );

  const mutatingCalls = calls.filter((call) => !call.url.endsWith('/auth/csrf'));
  assert.equal(mutatingCalls.length, 2);
  assert.deepEqual(
    mutatingCalls.map((call) => call.csrfHeader),
    ['shared-csrf-token', 'shared-csrf-token']
  );
});

test('SDK does not fetch a CSRF token for unauthenticated (skipAuth) mutations like login', async () => {
  const urls: string[] = [];

  const sdk = createProjectKitSdk({
    baseUrl: 'http://localhost:3000/api',
    csrf: {
      endpoint: '/auth/csrf'
    },
    fetchImpl: async (input) => {
      urls.push(String(input));
      return new Response(
        JSON.stringify({ expiresIn: 900, user: { organizations: [] } }),
        {
          status: 201,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }
  });

  await sdk.auth.login({
    email: 'admin@example.com',
    password: 'AdminPassword123!'
  });

  assert.deepEqual(urls, ['http://localhost:3000/api/auth/login']);
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

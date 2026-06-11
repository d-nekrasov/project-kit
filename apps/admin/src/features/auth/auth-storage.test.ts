import assert from 'node:assert/strict';
import { afterEach, test } from 'node:test';

import {
  clearRecentLogout,
  clearAuthStorage,
  clearActiveOrganizationId,
  consumeRecentLogout,
  getActiveOrganizationId,
  markRecentLogout,
  removeLegacyAccessToken,
  setActiveOrganizationId
} from './auth-storage';

class LocalStorageMock {
  private readonly storage = new Map<string, string>();

  getItem(key: string) {
    return this.storage.get(key) ?? null;
  }

  setItem(key: string, value: string) {
    this.storage.set(key, value);
  }

  removeItem(key: string) {
    this.storage.delete(key);
  }

  clear() {
    this.storage.clear();
  }
}

const localStorageMock = new LocalStorageMock();
const sessionStorageMock = new LocalStorageMock();

Object.defineProperty(globalThis, 'localStorage', {
  value: localStorageMock,
  configurable: true
});

Object.defineProperty(globalThis, 'sessionStorage', {
  value: sessionStorageMock,
  configurable: true
});

afterEach(() => {
  localStorageMock.clear();
  sessionStorageMock.clear();
});

test('auth storage keeps only organization context and never preserves access tokens in localStorage', () => {
  localStorage.setItem('project_kit_access_token', 'legacy-token');
  setActiveOrganizationId('org-1');

  assert.equal(getActiveOrganizationId(), 'org-1');

  removeLegacyAccessToken();
  assert.equal(localStorage.getItem('project_kit_access_token'), null);
  assert.equal(getActiveOrganizationId(), 'org-1');

  clearAuthStorage();
  assert.equal(localStorage.getItem('project_kit_access_token'), null);
  assert.equal(getActiveOrganizationId(), null);
});

test('active organization id can be cleared independently', () => {
  setActiveOrganizationId('org-2');
  clearActiveOrganizationId();

  assert.equal(getActiveOrganizationId(), null);
});

test('recent logout marker is consumed once', () => {
  assert.equal(consumeRecentLogout(), false);

  markRecentLogout();
  assert.equal(consumeRecentLogout(), true);
  assert.equal(consumeRecentLogout(), false);

  markRecentLogout();
  clearRecentLogout();
  assert.equal(consumeRecentLogout(), false);
});

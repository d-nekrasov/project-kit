import assert from 'node:assert/strict';
import { afterEach, test } from 'node:test';

import {
  clearAuthStorage,
  clearActiveOrganizationId,
  getActiveOrganizationId,
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

Object.defineProperty(globalThis, 'localStorage', {
  value: localStorageMock,
  configurable: true
});

afterEach(() => {
  localStorageMock.clear();
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

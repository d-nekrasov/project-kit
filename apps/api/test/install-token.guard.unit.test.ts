import assert from 'node:assert/strict';
import { test } from 'node:test';
import { ForbiddenException } from '@nestjs/common';
import { InstallTokenGuard } from '../src/core/installer/guards/install-token.guard';

function createGuard({
  env,
  installed = false
}: {
  env: Record<string, string | undefined>;
  installed?: boolean;
}) {
  const configService = {
    get: (key: string) => env[key]
  };
  const installerService = {
    getStatus: async () => ({ installed })
  };

  return new InstallTokenGuard(configService as any, installerService as any);
}

function createContext(headers: Record<string, string | string[] | undefined> = {}) {
  return {
    switchToHttp: () => ({
      getRequest: () => ({ headers })
    })
  } as any;
}

test('production without INSTALL_TOKEN rejects setup with a clear message while not installed', async () => {
  const guard = createGuard({ env: { APP_ENV: 'production' } });

  await assert.rejects(
    guard.canActivate(createContext()),
    (error: unknown) =>
      error instanceof ForbiddenException &&
      error.message === 'Set INSTALL_TOKEN to enable installation'
  );
});

test('production with a correct token in X-Install-Token passes', async () => {
  const guard = createGuard({ env: { APP_ENV: 'production', INSTALL_TOKEN: 'secret-token' } });

  assert.equal(
    await guard.canActivate(createContext({ 'x-install-token': 'secret-token' })),
    true
  );
});

test('production with a wrong or missing token rejects without detailing the reason', async () => {
  const guard = createGuard({ env: { APP_ENV: 'production', INSTALL_TOKEN: 'secret-token' } });

  for (const headers of [
    { 'x-install-token': 'wrong-token' },
    { 'x-install-token': '' },
    {}
  ]) {
    await assert.rejects(
      guard.canActivate(createContext(headers)),
      (error: unknown) =>
        error instanceof ForbiddenException && error.message === 'Forbidden'
    );
  }
});

test('development without INSTALL_TOKEN keeps setup open as before', async () => {
  const guard = createGuard({ env: { APP_ENV: 'development' } });

  assert.equal(await guard.canActivate(createContext()), true);
});

test('development with INSTALL_TOKEN configured enforces the token', async () => {
  const guard = createGuard({ env: { APP_ENV: 'development', INSTALL_TOKEN: 'dev-token' } });

  await assert.rejects(
    guard.canActivate(createContext({ 'x-install-token': 'wrong' })),
    ForbiddenException
  );
  assert.equal(
    await guard.canActivate(createContext({ 'x-install-token': 'dev-token' })),
    true
  );
});

test('after installation the guard passes regardless of the token, letting setup answer 409', async () => {
  for (const env of [
    { APP_ENV: 'production' },
    { APP_ENV: 'production', INSTALL_TOKEN: 'secret-token' }
  ]) {
    const guard = createGuard({ env, installed: true });
    assert.equal(await guard.canActivate(createContext()), true);
  }
});

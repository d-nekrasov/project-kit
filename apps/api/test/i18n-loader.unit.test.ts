import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync } from 'node:fs';
import { rm } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { after, test } from 'node:test';
import { I18nLoaderService } from '../src/core/i18n/i18n-loader.service';

const tempDirectories: string[] = [];

after(async () => {
  await Promise.all(tempDirectories.map((directoryPath) => rm(directoryPath, { recursive: true, force: true })));
});

test('I18nLoaderService loads and flattens core and module translations', async () => {
  const rootDir = mkdtempSync(join(tmpdir(), 'api-i18n-loader-'));
  tempDirectories.push(rootDir);

  mkdirSync(join(rootDir, 'core', 'lang', 'ru'), { recursive: true });
  mkdirSync(join(rootDir, 'modules', 'documents', 'lang', 'ru'), { recursive: true });

  writeFileSync(
    join(rootDir, 'core', 'lang', 'ru', 'common.json'),
    JSON.stringify({ common: { save: 'Сохранить', count: 3 } })
  );
  writeFileSync(
    join(rootDir, 'modules', 'documents', 'lang', 'ru', 'documents.json'),
    JSON.stringify({ documents: { enabled: true } })
  );

  const loader = new I18nLoaderService(rootDir);
  const coreMessages = await loader.loadCoreMessages('ru');
  const moduleMessages = await loader.loadModuleMessages('documents', 'ru');

  assert.deepEqual(coreMessages, {
    'common.save': 'Сохранить',
    'common.count': '3'
  });
  assert.deepEqual(moduleMessages, {
    'documents.enabled': 'true'
  });
});

test('I18nLoaderService merges flattened keys from multiple JSON files', async () => {
  const rootDir = mkdtempSync(join(tmpdir(), 'api-i18n-loader-'));
  tempDirectories.push(rootDir);

  mkdirSync(join(rootDir, 'core', 'lang', 'en'), { recursive: true });

  writeFileSync(
    join(rootDir, 'core', 'lang', 'en', 'auth.json'),
    JSON.stringify({ auth: { login: 'Login' } })
  );
  writeFileSync(
    join(rootDir, 'core', 'lang', 'en', 'common.json'),
    JSON.stringify({ common: { save: 'Save' } })
  );

  const loader = new I18nLoaderService(rootDir);

  assert.deepEqual(await loader.loadCoreMessages('en'), {
    'auth.login': 'Login',
    'common.save': 'Save'
  });
});

test('I18nLoaderService ignores missing directories', async () => {
  const rootDir = mkdtempSync(join(tmpdir(), 'api-i18n-loader-'));
  tempDirectories.push(rootDir);

  const loader = new I18nLoaderService(rootDir);

  assert.deepEqual(await loader.loadCoreMessages('en'), {});
  assert.deepEqual(await loader.loadModuleMessages('missing-module', 'en'), {});
});

test('I18nLoaderService ignores missing locale directories', async () => {
  const rootDir = mkdtempSync(join(tmpdir(), 'api-i18n-loader-'));
  tempDirectories.push(rootDir);

  mkdirSync(join(rootDir, 'core', 'lang', 'en'), { recursive: true });
  mkdirSync(join(rootDir, 'modules', 'documents', 'lang', 'en'), { recursive: true });
  writeFileSync(join(rootDir, 'core', 'lang', 'en', 'common.json'), JSON.stringify({ common: { save: 'Save' } }));

  const loader = new I18nLoaderService(rootDir);

  assert.deepEqual(await loader.loadCoreMessages('ru'), {});
  assert.deepEqual(await loader.loadModuleMessages('documents', 'ru'), {});
});

test('I18nLoaderService ignores invalid JSON files', async () => {
  const rootDir = mkdtempSync(join(tmpdir(), 'api-i18n-loader-'));
  tempDirectories.push(rootDir);

  mkdirSync(join(rootDir, 'core', 'lang', 'en'), { recursive: true });
  writeFileSync(join(rootDir, 'core', 'lang', 'en', 'broken.json'), '{');

  const loader = new I18nLoaderService(rootDir);

  assert.deepEqual(await loader.loadCoreMessages('en'), {});
});

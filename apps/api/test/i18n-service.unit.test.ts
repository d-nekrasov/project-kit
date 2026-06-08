import assert from 'node:assert/strict';
import { test } from 'node:test';
import { ModuleStatus, SettingScope } from '@prisma/client';
import { I18nLoaderService } from '../src/core/i18n/i18n-loader.service';
import { I18nService } from '../src/core/i18n/i18n.service';

test('I18nService merges fallback locale with primary locale and active modules only', async () => {
  const prisma = {
    setting: {
      findFirst: async (query: { where: { key: string; scope: SettingScope } }) => {
        assert.equal(query.where.key, 'system.locale');
        assert.equal(query.where.scope, SettingScope.GLOBAL);
        return { value: 'ru' };
      }
    },
    moduleRegistry: {
      findMany: async () => [
        { name: 'documents', status: ModuleStatus.ENABLED },
        { name: 'disabled-module', status: ModuleStatus.ENABLED }
      ]
    }
  };

  const loader = {
    loadCoreMessages: async (locale: string) =>
      locale === 'en'
        ? { 'common.save': 'Save', 'auth.login': 'Login' }
        : { 'common.save': 'Сохранить' },
    loadModuleMessages: async (moduleName: string, locale: string) => {
      if (moduleName === 'documents' && locale === 'en') {
        return { 'documents.title': 'Documents' };
      }
      if (moduleName === 'documents' && locale === 'ru') {
        return { 'documents.title': 'Документы' };
      }
      return {};
    },
    mergeCatalogs: (...catalogs: Array<Record<string, string>>) => Object.assign({}, ...catalogs)
  } satisfies Pick<
    I18nLoaderService,
    'loadCoreMessages' | 'loadModuleMessages' | 'mergeCatalogs'
  >;

  const service = new I18nService(prisma as any, loader as I18nLoaderService);
  const catalog = await service.getCatalog();

  assert.deepEqual(catalog, {
    locale: 'ru',
    fallbackLocale: 'en',
    messages: {
      'common.save': 'Сохранить',
      'auth.login': 'Login',
      'documents.title': 'Документы'
    }
  });
  assert.equal(service.translate(catalog.messages, 'missing.key'), 'missing.key');
});

test('I18nService falls back to en when system.locale is absent', async () => {
  const prisma = {
    setting: {
      findFirst: async () => null
    },
    moduleRegistry: {
      findMany: async () => []
    }
  };

  const loader = {
    loadCoreMessages: async () => ({ 'common.save': 'Save' }),
    loadModuleMessages: async () => ({}),
    mergeCatalogs: (...catalogs: Array<Record<string, string>>) => Object.assign({}, ...catalogs)
  } satisfies Pick<
    I18nLoaderService,
    'loadCoreMessages' | 'loadModuleMessages' | 'mergeCatalogs'
  >;

  const service = new I18nService(prisma as any, loader as I18nLoaderService);
  const catalog = await service.getCatalog();

  assert.deepEqual(catalog, {
    locale: 'en',
    fallbackLocale: 'en',
    messages: {
      'common.save': 'Save'
    }
  });
});

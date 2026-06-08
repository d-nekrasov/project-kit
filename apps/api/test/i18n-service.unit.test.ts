import assert from 'node:assert/strict';
import { test } from 'node:test';
import { ModuleStatus, SettingScope } from '@prisma/client';
import { I18nLoaderService, type I18nMessages } from '../src/core/i18n/i18n-loader.service';
import { I18nService } from '../src/core/i18n/i18n.service';

function createLoader(
  coreByLocale: Record<string, I18nMessages>,
  modulesByLocale: Record<string, Record<string, I18nMessages>>
) {
  return {
    loadCoreMessages: async (locale: string) => coreByLocale[locale] ?? {},
    loadModuleMessages: async (moduleName: string, locale: string) =>
      modulesByLocale[moduleName]?.[locale] ?? {},
    mergeCatalogs: (...catalogs: I18nMessages[]) => Object.assign({}, ...catalogs)
  } satisfies Pick<I18nLoaderService, 'loadCoreMessages' | 'loadModuleMessages' | 'mergeCatalogs'>;
}

function createPrisma(
  locale: string | null,
  moduleNames: string[] = ['documents'],
  disabledModuleNames: string[] = []
) {
  return {
    setting: {
      findFirst: async (query: { where: { key: string; scope: SettingScope } }) => {
        assert.equal(query.where.key, 'system.locale');
        assert.equal(query.where.scope, SettingScope.GLOBAL);
        return locale == null ? null : { value: locale };
      }
    },
    moduleRegistry: {
      findMany: async (query: { where: { status: ModuleStatus } }) => {
        assert.equal(query.where.status, ModuleStatus.ENABLED);
        return [
          ...moduleNames.map((name) => ({
            name,
            status: ModuleStatus.ENABLED
          })),
          ...disabledModuleNames.map((name) => ({
            name,
            status: ModuleStatus.DISABLED
          }))
        ].filter((moduleItem) => moduleItem.status === query.where.status);
      }
    }
  };
}

test('I18nService returns catalog for current system.locale with en fallback', async () => {
  const loader = createLoader(
    {
      en: { 'common.save': 'Save', 'auth.login': 'Login' },
      ru: { 'common.save': 'Сохранить' }
    },
    {
      documents: {
        en: { 'documents.title': 'Documents' },
        ru: { 'documents.title': 'Документы' }
      }
    }
  );

  const service = new I18nService(createPrisma('ru') as any, loader as I18nLoaderService);
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
});

test('I18nService returns en catalog when system.locale is en', async () => {
  const loader = createLoader(
    {
      en: { 'common.save': 'Save', 'auth.login': 'Login' }
    },
    {
      documents: {
        en: { 'documents.title': 'Documents' }
      }
    }
  );

  const service = new I18nService(createPrisma('en') as any, loader as I18nLoaderService);
  const catalog = await service.getCatalog();

  assert.deepEqual(catalog, {
    locale: 'en',
    fallbackLocale: 'en',
    messages: {
      'common.save': 'Save',
      'auth.login': 'Login',
      'documents.title': 'Documents'
    }
  });
});

test('I18nService uses ru when system.locale is absent', async () => {
  const loader = createLoader(
    {
      en: { 'common.save': 'Save' },
      ru: { 'common.save': 'Сохранить' }
    },
    {}
  );

  const service = new I18nService(createPrisma(null, []) as any, loader as I18nLoaderService);
  const catalog = await service.getCatalog();

  assert.deepEqual(catalog, {
    locale: 'ru',
    fallbackLocale: 'en',
    messages: {
      'common.save': 'Сохранить'
    }
  });
});

test('I18nService keeps ru as current locale and en as fallback when system.locale is absent', async () => {
  const loader = createLoader(
    {
      en: { 'modules.title': 'Modules' },
      ru: {}
    },
    {}
  );

  const service = new I18nService(createPrisma(null, []) as any, loader as I18nLoaderService);
  const catalog = await service.getCatalog();

  assert.equal(catalog.locale, 'ru');
  assert.equal(catalog.fallbackLocale, 'en');
  assert.equal(catalog.messages['modules.title'], 'Modules');
});

test('I18nService.translate returns key when translation is missing', () => {
  const loader = createLoader({}, {});
  const service = new I18nService(createPrisma('en', []) as any, loader as I18nLoaderService);

  assert.equal(service.translate({ 'common.save': 'Save' }, 'missing.key'), 'missing.key');
});

test('I18nService limits module translations to their namespace without breaking core keys', async () => {
  const loader = createLoader(
    {
      en: { 'common.save': 'Save', 'common.cancel': 'Cancel' },
      ru: { 'common.save': 'Сохранить' }
    },
    {
      documents: {
        en: {
          'documents.title': 'Documents',
          'common.save': 'Module override should be ignored'
        },
        ru: {
          'documents.title': 'Документы',
          'common.save': 'Перезапись, которую надо игнорировать'
        }
      }
    }
  );

  const service = new I18nService(createPrisma('ru') as any, loader as I18nLoaderService);
  const catalog = await service.getCatalog();

  assert.equal(catalog.messages['common.save'], 'Сохранить');
  assert.equal(catalog.messages['common.cancel'], 'Cancel');
  assert.equal(catalog.messages['documents.title'], 'Документы');
  assert.equal(catalog.messages['common.save'], 'Сохранить');
});

test('I18nService includes enabled module translations in catalog', async () => {
  const loader = createLoader(
    {
      en: { 'common.save': 'Save' },
      ru: { 'common.save': 'Сохранить' }
    },
    {
      documents: {
        en: {
          'documents.title': 'Documents',
          'documents.menu': 'Documents',
          'documents.description': 'Manage organization documents'
        },
        ru: {
          'documents.title': 'Документы',
          'documents.menu': 'Документы',
          'documents.description': 'Управление документами организации'
        }
      }
    }
  );

  const service = new I18nService(createPrisma('ru') as any, loader as I18nLoaderService);
  const catalog = await service.getCatalog();

  assert.equal(catalog.messages['documents.title'], 'Документы');
  assert.equal(catalog.messages['documents.menu'], 'Документы');
  assert.equal(catalog.messages['documents.description'], 'Управление документами организации');
});

test('I18nService falls back to en module translation when locale file is missing', async () => {
  const loader = createLoader(
    {
      en: { 'common.save': 'Save' },
      ru: { 'common.save': 'Сохранить' }
    },
    {
      documents: {
        en: { 'documents.title': 'Documents' }
      }
    }
  );

  const service = new I18nService(createPrisma('ru') as any, loader as I18nLoaderService);
  const catalog = await service.getCatalog();

  assert.equal(catalog.messages['documents.title'], 'Documents');
});

test('I18nService falls back to en core translation when key is missing in ru', async () => {
  const loader = createLoader(
    {
      en: { 'modules.manifestDialog.title': 'Module manifest' },
      ru: {}
    },
    {}
  );

  const service = new I18nService(createPrisma('ru', []) as any, loader as I18nLoaderService);
  const catalog = await service.getCatalog();

  assert.equal(catalog.messages['modules.manifestDialog.title'], 'Module manifest');
});

test('I18nService does not include translations for disabled modules', async () => {
  const loader = createLoader(
    {
      en: { 'common.save': 'Save' }
    },
    {
      documents: {
        en: { 'documents.title': 'Documents' }
      }
    }
  );

  const service = new I18nService(createPrisma('en', [], ['documents']) as any, loader as I18nLoaderService);
  const catalog = await service.getCatalog();

  assert.equal(catalog.messages['documents.title'], undefined);
});

test('I18nService tolerates module without lang directory', async () => {
  const loader = createLoader(
    {
      en: { 'common.save': 'Save' }
    },
    {
      documents: {
        en: { 'documents.title': 'Documents' }
      }
    }
  );

  const service = new I18nService(createPrisma('en', ['documents', 'missing']) as any, loader as I18nLoaderService);
  const catalog = await service.getCatalog();

  assert.equal(catalog.messages['common.save'], 'Save');
  assert.equal(catalog.messages['documents.title'], 'Documents');
});

test('I18nService preserves core fallback keys while applying locale overrides', async () => {
  const loader = createLoader(
    {
      en: {
        'common.save': 'Save',
        'common.cancel': 'Cancel',
        'modules.title': 'Modules'
      },
      ru: {
        'common.save': 'Сохранить'
      }
    },
    {}
  );

  const service = new I18nService(createPrisma('ru', []) as any, loader as I18nLoaderService);
  const catalog = await service.getCatalog();

  assert.equal(catalog.messages['common.save'], 'Сохранить');
  assert.equal(catalog.messages['common.cancel'], 'Cancel');
  assert.equal(catalog.messages['modules.title'], 'Modules');
});

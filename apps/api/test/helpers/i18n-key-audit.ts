import { resolve } from 'node:path';
import { I18nLoaderService } from '../../src/core/i18n/i18n-loader.service';

export type LocaleKeyDiff = {
  missingInLeft: string[];
  missingInRight: string[];
};

export async function auditLocaleKeys(
  loader = new I18nLoaderService(resolve(__dirname, '../../src'))
): Promise<{
  core: LocaleKeyDiff;
  modules: Record<string, LocaleKeyDiff>;
}> {
  const core = diffKeys(await loader.loadCoreMessages('ru'), await loader.loadCoreMessages('en'));
  const modules = {
    documents: diffKeys(
      await loader.loadModuleMessages('documents', 'ru'),
      await loader.loadModuleMessages('documents', 'en')
    )
  };

  return { core, modules };
}

function diffKeys(left: Record<string, string>, right: Record<string, string>): LocaleKeyDiff {
  const leftKeys = new Set(Object.keys(left));
  const rightKeys = new Set(Object.keys(right));

  return {
    missingInLeft: [...rightKeys].filter((key) => !leftKeys.has(key)).sort(),
    missingInRight: [...leftKeys].filter((key) => !rightKeys.has(key)).sort()
  };
}

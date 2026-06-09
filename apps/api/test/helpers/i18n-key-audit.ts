import { readdir, readFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { I18nLoaderService } from '../../src/core/i18n/i18n-loader.service';

export type LocaleKeyDiff = {
  missingInLeft: string[];
  missingInRight: string[];
};

type LocaleFileAudit = {
  file: string;
  missingLocales: string[];
  diff: LocaleKeyDiff;
};

type LocaleNamespaceAudit = {
  missingLocales: string[];
  files: LocaleFileAudit[];
  diff: LocaleKeyDiff;
};

export async function auditLocaleKeys(
  loader = new I18nLoaderService(resolve(__dirname, '../../src'))
): Promise<{
  core: LocaleNamespaceAudit & { ruKeys: string[]; enKeys: string[] };
  modules: Record<string, LocaleNamespaceAudit>;
}> {
  const srcRoot = resolve(__dirname, '../../src');
  const coreRuMessages = await loader.loadCoreMessages('ru');
  const coreEnMessages = await loader.loadCoreMessages('en');
  const core = await auditNamespace({
    leftDir: join(srcRoot, 'core', 'lang', 'ru'),
    rightDir: join(srcRoot, 'core', 'lang', 'en'),
    leftMessages: coreRuMessages,
    rightMessages: coreEnMessages
  });
  const modulesRoot = join(srcRoot, 'modules');
  const moduleNames = await listModuleNames(modulesRoot);
  const modules = Object.fromEntries(
    await Promise.all(
      moduleNames.map(async (moduleName) => {
        const moduleAudit = await auditNamespace({
          leftDir: join(modulesRoot, moduleName, 'lang', 'ru'),
          rightDir: join(modulesRoot, moduleName, 'lang', 'en'),
          leftMessages: await loader.loadModuleMessages(moduleName, 'ru'),
          rightMessages: await loader.loadModuleMessages(moduleName, 'en')
        });

        return [moduleName, moduleAudit] as const;
      })
    )
  );

  return {
    core: {
      ...core,
      ruKeys: Object.keys(coreRuMessages).sort(),
      enKeys: Object.keys(coreEnMessages).sort()
    },
    modules
  };
}

async function listModuleNames(modulesRoot: string) {
  const entries = await readdir(modulesRoot, { withFileTypes: true });
  return entries.filter((entry) => entry.isDirectory()).map((entry) => entry.name).sort();
}

async function auditNamespace({
  leftDir,
  rightDir,
  leftMessages,
  rightMessages
}: {
  leftDir: string;
  rightDir: string;
  leftMessages: Record<string, string>;
  rightMessages: Record<string, string>;
}): Promise<LocaleNamespaceAudit> {
  const leftFiles = await readJsonFiles(leftDir);
  const rightFiles = await readJsonFiles(rightDir);
  const files = [...new Set([...leftFiles.keys(), ...rightFiles.keys()])]
    .sort()
    .map((file) => {
      const left = leftFiles.get(file);
      const right = rightFiles.get(file);
      return {
        file,
        missingLocales: [left ? null : 'ru', right ? null : 'en'].filter(Boolean) as string[],
        diff: diffKeys(left ?? {}, right ?? {})
      } satisfies LocaleFileAudit;
    });

  return {
    missingLocales: [...(leftFiles.size === 0 && rightFiles.size > 0 ? ['ru'] : []), ...(rightFiles.size === 0 && leftFiles.size > 0 ? ['en'] : [])],
    files,
    diff: diffKeys(leftMessages, rightMessages)
  };
}

async function readJsonFiles(directoryPath: string) {
  try {
    const fileNames = (await readdir(directoryPath)).filter((fileName) => fileName.endsWith('.json')).sort();
    const entries = await Promise.all(
      fileNames.map(async (fileName) => {
        const raw = await readFile(join(directoryPath, fileName), 'utf8');
        return [fileName, flattenMessages(JSON.parse(raw))] as const;
      })
    );
    return new Map(entries);
  } catch {
    return new Map<string, Record<string, string>>();
  }
}

function flattenMessages(input: unknown, prefix?: string): Record<string, string> {
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    return {};
  }

  return Object.entries(input as Record<string, unknown>).reduce<Record<string, string>>((result, [key, value]) => {
    const nextKey = prefix ? `${prefix}.${key}` : key;
    if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
      result[nextKey] = String(value);
      return result;
    }
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      Object.assign(result, flattenMessages(value, nextKey));
    }
    return result;
  }, {});
}

function diffKeys(left: Record<string, string>, right: Record<string, string>): LocaleKeyDiff {
  const leftKeys = new Set(Object.keys(left));
  const rightKeys = new Set(Object.keys(right));

  return {
    missingInLeft: [...rightKeys].filter((key) => !leftKeys.has(key)).sort(),
    missingInRight: [...leftKeys].filter((key) => !rightKeys.has(key)).sort()
  };
}

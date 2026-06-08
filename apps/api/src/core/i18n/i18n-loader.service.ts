import { Injectable } from '@nestjs/common';
import { readdir, readFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';

export type I18nMessages = Record<string, string>;

@Injectable()
export class I18nLoaderService {
  private readonly rootDirs: string[];

  constructor(rootDir: string | string[] = [resolve(__dirname, '../../'), resolve(__dirname, '../../../')]) {
    this.rootDirs = Array.isArray(rootDir) ? rootDir : [rootDir];
  }

  async loadCoreMessages(locale: string): Promise<I18nMessages> {
    return this.loadMessagesFromDirectories(
      this.rootDirs.map((rootDir) => join(rootDir, 'core', 'lang', locale))
    );
  }

  async loadModuleMessages(moduleName: string, locale: string): Promise<I18nMessages> {
    return this.loadMessagesFromDirectories(
      this.rootDirs.map((rootDir) => join(rootDir, 'modules', moduleName, 'lang', locale))
    );
  }

  mergeCatalogs(...catalogs: I18nMessages[]): I18nMessages {
    return Object.assign({}, ...catalogs);
  }

  private async loadMessagesFromDirectories(directoryPaths: string[]): Promise<I18nMessages> {
    const catalogs = await Promise.all(directoryPaths.map((directoryPath) => this.loadMessagesFromDirectory(directoryPath)));
    return this.mergeCatalogs(...catalogs);
  }

  private async loadMessagesFromDirectory(directoryPath: string): Promise<I18nMessages> {
    let fileNames: string[];
    try {
      fileNames = await readdir(directoryPath);
    } catch {
      return {};
    }

    const jsonFiles = fileNames.filter((fileName) => fileName.endsWith('.json')).sort();
    const loadedFiles = await Promise.all(
      jsonFiles.map(async (fileName) => {
        const filePath = join(directoryPath, fileName);
        try {
          const raw = await readFile(filePath, 'utf8');
          const parsed = JSON.parse(raw) as unknown;
          return this.flattenMessages(parsed);
        } catch {
          return {};
        }
      })
    );

    return this.mergeCatalogs(...loadedFiles);
  }

  private flattenMessages(input: unknown, prefix?: string): I18nMessages {
    if (!input || typeof input !== 'object' || Array.isArray(input)) {
      return {};
    }

    const entries = Object.entries(input as Record<string, unknown>);
    return entries.reduce<I18nMessages>((result, [key, value]) => {
      const nextKey = prefix ? `${prefix}.${key}` : key;
      if (typeof value === 'string') {
        result[nextKey] = value;
        return result;
      }
      if (typeof value === 'number' || typeof value === 'boolean') {
        result[nextKey] = String(value);
        return result;
      }
      if (value && typeof value === 'object' && !Array.isArray(value)) {
        Object.assign(result, this.flattenMessages(value, nextKey));
      }
      return result;
    }, {});
  }
}

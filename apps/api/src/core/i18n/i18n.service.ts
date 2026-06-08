import { Injectable } from '@nestjs/common';
import { ModuleStatus, SettingScope } from '@prisma/client';
import { PrismaService } from '../../infrastructure/prisma/prisma.service';
import { I18nLoaderService, I18nMessages } from './i18n-loader.service';

export type I18nCatalogResponse = {
  locale: string;
  fallbackLocale: string;
  messages: I18nMessages;
};

const FALLBACK_LOCALE = 'en';

@Injectable()
export class I18nService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly i18nLoaderService: I18nLoaderService
  ) {}

  async getCatalog(): Promise<I18nCatalogResponse> {
    const locale = await this.getPrimaryLocale();
    const fallbackLocale = FALLBACK_LOCALE;
    const enabledModules = await this.getEnabledModuleNames();

    const fallbackMessages = await this.loadMergedMessages(fallbackLocale, enabledModules);
    const localeMessages =
      locale === fallbackLocale ? fallbackMessages : await this.loadMergedMessages(locale, enabledModules);

    return {
      locale,
      fallbackLocale,
      messages: this.i18nLoaderService.mergeCatalogs(fallbackMessages, localeMessages)
    };
  }

  translate(messages: I18nMessages, key: string): string {
    return messages[key] ?? key;
  }

  private async getPrimaryLocale(): Promise<string> {
    const setting = await this.prisma.setting.findFirst({
      where: {
        key: 'system.locale',
        scope: SettingScope.GLOBAL,
        organizationId: null,
        moduleCode: null
      },
      orderBy: { createdAt: 'desc' },
      select: { value: true }
    });

    const rawValue = setting?.value;
    if (typeof rawValue === 'string' && rawValue.trim()) {
      return rawValue.trim().toLowerCase();
    }

    return FALLBACK_LOCALE;
  }

  private async getEnabledModuleNames(): Promise<string[]> {
    const modules = await this.prisma.moduleRegistry.findMany({
      where: { status: ModuleStatus.ENABLED },
      select: { name: true },
      orderBy: { name: 'asc' }
    });

    return modules
      .map((moduleItem) => moduleItem.name.trim().toLowerCase())
      .filter((moduleName) => moduleName && moduleName !== 'core');
  }

  private async loadMergedMessages(locale: string, moduleNames: string[]): Promise<I18nMessages> {
    const coreMessages = await this.i18nLoaderService.loadCoreMessages(locale);
    const moduleMessages = await Promise.all(
      moduleNames.map(async (moduleName) =>
        this.limitModuleMessagesToNamespace(
          moduleName,
          await this.i18nLoaderService.loadModuleMessages(moduleName, locale)
        )
      )
    );

    return this.i18nLoaderService.mergeCatalogs(coreMessages, ...moduleMessages);
  }

  private limitModuleMessagesToNamespace(moduleName: string, messages: I18nMessages): I18nMessages {
    const namespacePrefix = `${moduleName}.`;
    return Object.fromEntries(
      Object.entries(messages).filter(([key]) => key.startsWith(namespacePrefix))
    );
  }
}

export type I18nMessages = Record<string, string>;

export type I18nParams = Record<string, string | number | boolean | null | undefined>;

export type I18nCatalogResponse = {
  locale: string;
  fallbackLocale: string;
  messages: I18nMessages;
};

export type I18nContextValue = {
  locale: string;
  messages: I18nMessages;
  isLoading: boolean;
  t: (key: string, params?: I18nParams) => string;
};

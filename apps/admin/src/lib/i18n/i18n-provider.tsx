import { createContext, useCallback, useEffect, useMemo, useRef, useState, type PropsWithChildren } from 'react';

import { sdk } from '@/lib/sdk';
import type { I18nCatalogResponse, I18nContextValue, I18nMessages, I18nParams } from '@/lib/i18n/types';

const DEFAULT_LOCALE = 'ru';
const EMPTY_MESSAGES: I18nMessages = {};

function updateDocumentLanguage(nextLocale: string) {
  if (typeof document !== 'undefined') {
    document.documentElement.lang = nextLocale;
  }
}

function interpolate(template: string, params?: I18nParams) {
  if (!params) {
    return template;
  }

  return template.replace(/\{\{(\w+)\}\}/g, (_, token: string) => {
    const value = params[token];
    return value == null ? '' : String(value);
  });
}

const defaultContextValue: I18nContextValue = {
  locale: DEFAULT_LOCALE,
  messages: EMPTY_MESSAGES,
  isLoading: true,
  t: (key, params) => interpolate(key, params),
  reloadCatalog: async () => undefined
};

export const I18nContext = createContext<I18nContextValue>(defaultContextValue);

export function I18nProvider({ children }: PropsWithChildren) {
  const [locale, setLocale] = useState(DEFAULT_LOCALE);
  const [messages, setMessages] = useState<I18nMessages>(EMPTY_MESSAGES);
  const [isLoading, setIsLoading] = useState(true);
  const isMountedRef = useRef(true);

  const loadCatalog = useCallback(async () => {
    if (isMountedRef.current) {
      setIsLoading(true);
    }

    try {
      const catalog = await sdk.client.get<I18nCatalogResponse>('/i18n/catalog', {
        skipAuth: true,
        skipOrganization: true
      });
      const nextLocale = catalog.locale || DEFAULT_LOCALE;
      const nextMessages = catalog.messages ?? EMPTY_MESSAGES;

      if (!isMountedRef.current) {
        return;
      }

      setLocale(nextLocale);
      setMessages(nextMessages);
      updateDocumentLanguage(nextLocale);
    } catch {
      if (!isMountedRef.current) {
        return;
      }

      setLocale(DEFAULT_LOCALE);
      setMessages(EMPTY_MESSAGES);
      updateDocumentLanguage(DEFAULT_LOCALE);
    } finally {
      if (isMountedRef.current) {
        setIsLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    isMountedRef.current = true;

    void loadCatalog();

    return () => {
      isMountedRef.current = false;
    };
  }, [loadCatalog]);

  const t = useCallback(
    (key: string, params?: I18nParams) => {
      const message = messages[key] ?? key;
      return interpolate(message, params);
    },
    [messages]
  );

  const value = useMemo<I18nContextValue>(
    () => ({
      locale,
      messages,
      isLoading,
      t,
      reloadCatalog: loadCatalog
    }),
    [isLoading, loadCatalog, locale, messages, t]
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

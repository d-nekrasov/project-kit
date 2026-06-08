export function translateWithFallback(
  t: (key: string, params?: Record<string, string | number | boolean | null | undefined>) => string,
  key: string | null | undefined,
  fallback?: string | null,
  params?: Record<string, string | number | boolean | null | undefined>
) {
  if (!key) {
    return fallback ?? '';
  }

  const translated = t(key, params);
  return translated === key && fallback ? fallback : translated;
}

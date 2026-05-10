export function buildQueryString(query?: Record<string, unknown>): string {
  if (!query) {
    return '';
  }

  const params: string[] = [];

  const pushParam = (key: string, value: unknown): void => {
    if (value === null || value === undefined || value === '') {
      return;
    }

    if (Array.isArray(value)) {
      for (const item of value) {
        pushParam(key, item);
      }
      return;
    }

    const normalizedValue = value instanceof Date ? value.toISOString() : String(value);
    params.push(`${encodeURIComponent(key)}=${encodeURIComponent(normalizedValue)}`);
  };

  for (const [key, value] of Object.entries(query)) {
    pushParam(key, value);
  }

  return params.length > 0 ? `?${params.join('&')}` : '';
}

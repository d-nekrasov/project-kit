const DEFAULT_DURATION_MS = 15 * 60 * 1000;

export function parseDurationToMs(value: string): number {
  const normalized = value.trim();
  if (!normalized) {
    return DEFAULT_DURATION_MS;
  }

  if (/^\d+$/.test(normalized)) {
    return Number.parseInt(normalized, 10) * 1000;
  }

  const match = normalized.match(/^(\d+)(ms|s|m|h|d)$/i);
  if (!match) {
    return DEFAULT_DURATION_MS;
  }

  const amount = Number.parseInt(match[1], 10);
  const unit = match[2].toLowerCase();
  const multipliers: Record<string, number> = {
    ms: 1,
    s: 1000,
    m: 60 * 1000,
    h: 60 * 60 * 1000,
    d: 24 * 60 * 60 * 1000,
  };

  return amount * multipliers[unit];
}

export function parseBooleanFlag(
  value: string | undefined,
  defaultValue = false,
): boolean {
  if (value === undefined) {
    return defaultValue;
  }

  const normalized = value.trim().toLowerCase();
  if (["1", "true", "yes", "on"].includes(normalized)) {
    return true;
  }
  if (["0", "false", "no", "off", ""].includes(normalized)) {
    return false;
  }

  return defaultValue;
}

export function parseIntegerEnv(
  value: string | undefined,
  defaultValue: number,
): number {
  if (!value) {
    return defaultValue;
  }

  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed)) {
    return defaultValue;
  }

  return parsed;
}

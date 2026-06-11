export type TrustProxySetting = boolean | number | string;

const TRUST_PROXY_NAMED_VALUES = new Set([
  "loopback",
  "linklocal",
  "uniquelocal",
]);

export function resolveTrustProxy(
  value: string | undefined,
): TrustProxySetting {
  if (!value) {
    return false;
  }

  const normalized = value.trim().toLowerCase();

  if (normalized === "" || normalized === "false" || normalized === "0") {
    return false;
  }

  if (normalized === "true") {
    return true;
  }

  if (TRUST_PROXY_NAMED_VALUES.has(normalized)) {
    return normalized;
  }

  const parsedNumber = Number.parseInt(normalized, 10);
  if (Number.isFinite(parsedNumber) && parsedNumber >= 0) {
    return parsedNumber;
  }

  return value;
}

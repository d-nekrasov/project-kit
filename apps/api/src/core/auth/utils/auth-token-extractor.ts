import type { IncomingHttpHeaders } from "node:http";

export function extractBearerTokenFromHeaders(
  headers: IncomingHttpHeaders | Record<string, string | string[] | undefined>,
  bearerEnabled = true,
): string | null {
  if (!bearerEnabled) {
    return null;
  }

  const authorization = headers.authorization;
  const value = Array.isArray(authorization)
    ? authorization[0]
    : authorization;
  if (!value) {
    return null;
  }

  const [scheme, token] = value.split(" ");
  if (scheme?.toLowerCase() !== "bearer" || !token) {
    return null;
  }

  return token;
}

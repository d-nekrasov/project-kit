const MIN_SECRET_BYTES = 32;
const GENERATE_HINT = "Generate a strong secret with: openssl rand -base64 48";
const KNOWN_WEAK_SECRETS = new Set([
  "change_me",
  "changeme",
  "secret",
  "password",
  "jwt_secret",
  "test",
  "dev",
]);

export class WeakJwtSecretError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "WeakJwtSecretError";
  }
}

export type JwtSecretValidationResult = {
  ok: true;
  warnings: string[];
};

/**
 * Validates JWT_SECRET strength on startup. A weak or default secret lets an
 * attacker forge any JWT, including SSE stream tokens signed with the same key.
 *
 * production: throws WeakJwtSecretError when the secret is missing, shorter
 * than 32 utf8 bytes, or a known weak value (case/whitespace-insensitive).
 * development/test: returns the same findings as warnings without blocking.
 */
export function validateJwtSecret(
  secret: string | undefined,
  isProduction: boolean,
): JwtSecretValidationResult {
  if (!secret) {
    throw new WeakJwtSecretError(`JWT_SECRET is required. ${GENERATE_HINT}`);
  }

  const normalized = secret.trim();
  const problems: string[] = [];

  if (KNOWN_WEAK_SECRETS.has(normalized.toLowerCase())) {
    problems.push(
      `JWT_SECRET is set to the well-known weak value "${normalized}".`,
    );
  }

  if (Buffer.byteLength(normalized, "utf8") < MIN_SECRET_BYTES) {
    problems.push(
      `JWT_SECRET must be at least ${MIN_SECRET_BYTES} bytes (utf8), got ${Buffer.byteLength(normalized, "utf8")}.`,
    );
  }

  if (problems.length === 0) {
    return { ok: true, warnings: [] };
  }

  if (isProduction) {
    throw new WeakJwtSecretError(`${problems.join(" ")} ${GENERATE_HINT}`);
  }

  return {
    ok: true,
    warnings: problems.map((problem) => `${problem} ${GENERATE_HINT}`),
  };
}

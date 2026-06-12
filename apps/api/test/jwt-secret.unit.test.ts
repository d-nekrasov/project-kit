import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";
import { test } from "node:test";

import {
  validateJwtSecret,
  WeakJwtSecretError,
} from "../src/common/security/jwt-secret.util";

const strongSecret = randomBytes(48).toString("base64");

test("validateJwtSecret accepts a random 32+ byte secret in production", () => {
  const result = validateJwtSecret(strongSecret, true);
  assert.equal(result.ok, true);
  assert.deepEqual(result.warnings, []);
});

test("validateJwtSecret throws in production when the secret is missing", () => {
  assert.throws(
    () => validateJwtSecret(undefined, true),
    /JWT_SECRET is required.*openssl rand -base64 48/,
  );
});

test("validateJwtSecret throws in production for a short secret", () => {
  assert.throws(
    () => validateJwtSecret("short-secret", true),
    (error: unknown) =>
      error instanceof WeakJwtSecretError &&
      /at least 32 bytes/.test(error.message) &&
      /openssl rand -base64 48/.test(error.message),
  );
});

test("validateJwtSecret rejects known weak values regardless of case and whitespace", () => {
  assert.throws(() => validateJwtSecret("Change_Me", true), WeakJwtSecretError);
  assert.throws(() => validateJwtSecret(" change_me ", true), WeakJwtSecretError);
  assert.throws(() => validateJwtSecret("SECRET", true), WeakJwtSecretError);
});

test("validateJwtSecret only warns about weak secrets outside production", () => {
  const result = validateJwtSecret("change_me", false);
  assert.equal(result.ok, true);
  assert.equal(result.warnings.length > 0, true);
  assert.match(result.warnings.join(" "), /change_me/);
  assert.match(result.warnings.join(" "), /openssl rand -base64 48/);
});

test("validateJwtSecret still requires a secret outside production", () => {
  assert.throws(() => validateJwtSecret(undefined, false), WeakJwtSecretError);
  assert.throws(() => validateJwtSecret("", false), WeakJwtSecretError);
});

test("validateJwtSecret measures length in utf8 bytes, not characters", () => {
  // 16 cyrillic characters = 32 utf8 bytes.
  const sixteenCyrillicChars = "ж".repeat(16);
  assert.equal(Buffer.byteLength(sixteenCyrillicChars, "utf8"), 32);
  assert.deepEqual(validateJwtSecret(sixteenCyrillicChars, true).warnings, []);

  // 31 ascii characters is too short even though it is "long" visually.
  assert.throws(
    () => validateJwtSecret("a".repeat(31), true),
    WeakJwtSecretError,
  );
});

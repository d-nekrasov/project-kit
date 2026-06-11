import assert from "node:assert/strict";
import { test } from "node:test";

import {
  createConfigEncryptionService,
  generateConfigEncryptionKey,
} from "./helpers/config-encryption";

const configEncryptionKey = generateConfigEncryptionKey();
const rotatedConfigEncryptionKey = generateConfigEncryptionKey();

test("ConfigEncryptionService encrypts and decrypts values", () => {
  const service = createConfigEncryptionService({ configEncryptionKey });

  const encrypted = service.encrypt("SuperSecret123!");
  assert.match(encrypted, /^enc:v1:/);
  assert.notEqual(encrypted, "SuperSecret123!");
  assert.equal(service.decrypt(encrypted), "SuperSecret123!");
});

test("ConfigEncryptionService requires a valid key in production", () => {
  assert.throws(
    () => createConfigEncryptionService({ appEnv: "production" }),
    /CONFIG_ENCRYPTION_KEY is required/,
  );
});

test("ConfigEncryptionService reports a clear error when encrypting without CONFIG_ENCRYPTION_KEY", () => {
  const service = createConfigEncryptionService({ appEnv: "development" });

  assert.throws(
    () => service.encrypt("SuperSecret123!"),
    /CONFIG_ENCRYPTION_KEY is required to store or read sensitive connector config/,
  );
});

test("ConfigEncryptionService reports a clear error when encrypted values cannot be decrypted with the current key", () => {
  const originalService = createConfigEncryptionService({
    configEncryptionKey,
  });
  const rotatedService = createConfigEncryptionService({
    configEncryptionKey: rotatedConfigEncryptionKey,
  });

  const encrypted = originalService.encrypt("SuperSecret123!");

  assert.throws(
    () => rotatedService.decrypt(encrypted),
    /Failed to decrypt sensitive connector config/,
  );
});

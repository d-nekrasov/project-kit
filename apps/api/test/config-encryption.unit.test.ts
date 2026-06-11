import assert from "node:assert/strict";
import { test } from "node:test";

import { ConfigService } from "@nestjs/config";

import { ConfigEncryptionService } from "../src/common/security/config-encryption.service";

const configEncryptionKey = "MDEyMzQ1Njc4OWFiY2RlZjAxMjM0NTY3ODlhYmNkZWY=";
const rotatedConfigEncryptionKey = "abcdefghijklmnopqrstuvwxyzABCDEF";

test("ConfigEncryptionService encrypts and decrypts values", () => {
  const service = new ConfigEncryptionService(
    new ConfigService({
      APP_ENV: "test",
      CONFIG_ENCRYPTION_KEY: configEncryptionKey,
    }),
  );

  const encrypted = service.encrypt("SuperSecret123!");
  assert.match(encrypted, /^enc:v1:/);
  assert.notEqual(encrypted, "SuperSecret123!");
  assert.equal(service.decrypt(encrypted), "SuperSecret123!");
});

test("ConfigEncryptionService requires a valid key in production", () => {
  assert.throws(
    () =>
      new ConfigEncryptionService(
        new ConfigService({
          APP_ENV: "production",
        }),
      ),
    /CONFIG_ENCRYPTION_KEY is required/,
  );
});

test("ConfigEncryptionService reports a clear error when encrypting without CONFIG_ENCRYPTION_KEY", () => {
  const service = new ConfigEncryptionService(
    new ConfigService({
      APP_ENV: "development",
    }),
  );

  assert.throws(
    () => service.encrypt("SuperSecret123!"),
    /CONFIG_ENCRYPTION_KEY is required to store or read sensitive connector config/,
  );
});

test("ConfigEncryptionService reports a clear error when encrypted values cannot be decrypted with the current key", () => {
  const originalService = new ConfigEncryptionService(
    new ConfigService({
      APP_ENV: "test",
      CONFIG_ENCRYPTION_KEY: configEncryptionKey,
    }),
  );
  const rotatedService = new ConfigEncryptionService(
    new ConfigService({
      APP_ENV: "test",
      CONFIG_ENCRYPTION_KEY: rotatedConfigEncryptionKey,
    }),
  );

  const encrypted = originalService.encrypt("SuperSecret123!");

  assert.throws(
    () => rotatedService.decrypt(encrypted),
    /Failed to decrypt sensitive connector config/,
  );
});

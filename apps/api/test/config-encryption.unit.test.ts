import assert from "node:assert/strict";
import { test } from "node:test";

import { ConfigService } from "@nestjs/config";

import { ConfigEncryptionService } from "../src/common/security/config-encryption.service";

const configEncryptionKey = "MDEyMzQ1Njc4OWFiY2RlZjAxMjM0NTY3ODlhYmNkZWY=";

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

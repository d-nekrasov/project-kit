import { randomBytes } from "node:crypto";

import { ConfigService } from "@nestjs/config";

import { ConfigEncryptionService } from "../../src/common/security/config-encryption.service";

export function generateConfigEncryptionKey(): string {
  return randomBytes(32).toString("base64");
}

export function createConfigEncryptionService(options: {
  configEncryptionKey?: string;
  appEnv?: string;
} = {}): ConfigEncryptionService {
  // Importing @prisma/client loads apps/api/.env into process.env, and
  // ConfigService prefers process.env over the internal config passed below,
  // so a developer's CONFIG_ENCRYPTION_KEY (even an empty one) would override
  // the test key. Clear the variables so tests only see the values they set.
  delete process.env.CONFIG_ENCRYPTION_KEY;
  delete process.env.APP_ENV;

  return new ConfigEncryptionService(
    new ConfigService({
      APP_ENV: options.appEnv ?? "test",
      ...(options.configEncryptionKey !== undefined
        ? { CONFIG_ENCRYPTION_KEY: options.configEncryptionKey }
        : {}),
    }),
  );
}

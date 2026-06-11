import assert from "node:assert/strict";
import { test } from "node:test";

import { ConfigEncryptionService } from "../src/common/security/config-encryption.service";
import { backfillNotificationConnectorSecrets } from "../src/core/notifications/notification-connector-secrets-backfill";
import {
  createConfigEncryptionService,
  generateConfigEncryptionKey,
} from "./helpers/config-encryption";

const configEncryptionKey = generateConfigEncryptionKey();

function createEncryptionService(): ConfigEncryptionService {
  return createConfigEncryptionService({ configEncryptionKey });
}

test("notification connector secret backfill encrypts plaintext secrets and is idempotent", async () => {
  const connectors = [
    {
      id: "connector-1",
      code: "smtp_email",
      config: {
        host: "smtp.example.com",
        password: "SuperSecret123!",
        token: "notify-token",
        port: 587,
      },
    },
    {
      id: "connector-2",
      code: "webhook",
      config: {
        apiKey: createEncryptionService().encrypt("existing-api-key"),
        secret: "",
      },
    },
  ];
  const updates: Array<{ id: string; config: Record<string, unknown> | null }> = [];

  const repository = {
    async findMany(): Promise<typeof connectors> {
      return connectors;
    },
    async update({
      where,
      data,
    }: {
      where: { id: string };
      data: { config: Record<string, unknown> | null };
    }): Promise<void> {
      const connector = connectors.find((entry) => entry.id === where.id);
      assert.ok(connector);
      connector.config = data.config;
      updates.push({ id: where.id, config: data.config });
    },
  };

  const encryptionService = createEncryptionService();

  const firstRun = await backfillNotificationConnectorSecrets(
    repository as never,
    encryptionService,
  );
  assert.deepEqual(firstRun, {
    scanned: 2,
    updated: 1,
    skipped: 1,
  });
  assert.equal(updates.length, 1);
  assert.match(String(connectors[0]?.config.password), /^enc:v1:/);
  assert.match(String(connectors[0]?.config.token), /^enc:v1:/);
  assert.equal(connectors[0]?.config.host, "smtp.example.com");
  assert.equal(connectors[1]?.config.secret, "");

  const secondRun = await backfillNotificationConnectorSecrets(
    repository as never,
    encryptionService,
  );
  assert.deepEqual(secondRun, {
    scanned: 2,
    updated: 0,
    skipped: 2,
  });
  assert.equal(updates.length, 1);
});

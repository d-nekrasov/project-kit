import assert from "node:assert/strict";
import { test } from "node:test";

import { NotificationChannel, NotificationConnectorStatus } from "@prisma/client";
import { ConfigService } from "@nestjs/config";

import { ConfigEncryptionService } from "../src/common/security/config-encryption.service";
import { NotificationConnectorsService } from "../src/core/notifications/notification-connectors.service";

const configEncryptionKey = "MDEyMzQ1Njc4OWFiY2RlZjAxMjM0NTY3ODlhYmNkZWY=";

function createServiceHarness() {
  let storedConfig: Record<string, unknown> = {
    host: "smtp.example.com",
    password: "enc:v1:existing",
  };

  const prisma = {
    notificationConnector: {
      findUnique: async () => ({
        id: "connector-1",
        code: "smtp_email",
        channel: NotificationChannel.EMAIL,
        status: NotificationConnectorStatus.ENABLED,
        config: storedConfig,
        createdAt: new Date(),
        updatedAt: new Date(),
      }),
      findMany: async () => [
        {
          id: "connector-1",
          code: "smtp_email",
          channel: NotificationChannel.EMAIL,
          status: NotificationConnectorStatus.ENABLED,
          config: storedConfig,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ],
      update: async ({ data }: { data: { config: Record<string, unknown> } }) => {
        storedConfig = data.config;
        return {
          id: "connector-1",
          code: "smtp_email",
          channel: NotificationChannel.EMAIL,
          status: NotificationConnectorStatus.ENABLED,
          config: storedConfig,
          createdAt: new Date(),
          updatedAt: new Date(),
        };
      },
    },
  };

  const service = new NotificationConnectorsService(
    prisma as any,
    { write: async () => undefined } as any,
    new ConfigEncryptionService(
      new ConfigService({
        APP_ENV: "test",
        CONFIG_ENCRYPTION_KEY: configEncryptionKey,
      }),
    ),
  );

  return {
    service,
    getStoredConfig: () => storedConfig,
  };
}

test("NotificationConnectorsService encrypts passwords and masks them in API responses", async () => {
  const { service, getStoredConfig } = createServiceHarness();

  const response = await service.update(
    "smtp_email",
    {
      config: {
        host: "smtp.example.com",
        password: "SuperSecret123!",
      },
    },
    {
      id: "user-1",
      systemRoles: ["super_admin"],
    } as any,
    { id: "org-1" } as any,
  );

  assert.equal(response.config?.password, "********");
  assert.notEqual(getStoredConfig().password, "SuperSecret123!");
  assert.match(String(getStoredConfig().password), /^enc:v1:/);
});

test('NotificationConnectorsService preserves existing secret when password is updated with "********"', async () => {
  const { service, getStoredConfig } = createServiceHarness();
  const originalPassword = getStoredConfig().password;

  await service.update(
    "smtp_email",
    {
      config: {
        host: "smtp2.example.com",
        password: "********",
      },
    },
    {
      id: "user-1",
      systemRoles: ["super_admin"],
    } as any,
    { id: "org-1" } as any,
  );

  assert.equal(getStoredConfig().password, originalPassword);
  assert.equal(getStoredConfig().host, "smtp2.example.com");
});

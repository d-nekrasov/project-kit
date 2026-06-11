import assert from "node:assert/strict";
import { test } from "node:test";

import { NotificationChannel, NotificationConnectorStatus } from "@prisma/client";

import { NotificationConnectorsService } from "../src/core/notifications/notification-connectors.service";
import {
  createConfigEncryptionService,
  generateConfigEncryptionKey,
} from "./helpers/config-encryption";

const configEncryptionKey = generateConfigEncryptionKey();

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
    createConfigEncryptionService({ configEncryptionKey }),
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

test("NotificationConnectorsService returns a clear error when saving sensitive config without CONFIG_ENCRYPTION_KEY", async () => {
  const prisma = {
    notificationConnector: {
      findUnique: async () => ({
        id: "connector-1",
        code: "smtp_email",
        channel: NotificationChannel.EMAIL,
        status: NotificationConnectorStatus.ENABLED,
        config: {},
        createdAt: new Date(),
        updatedAt: new Date(),
      }),
      update: async () => {
        throw new Error("update should not be called");
      },
    },
  };

  const service = new NotificationConnectorsService(
    prisma as any,
    { write: async () => undefined } as any,
    createConfigEncryptionService({ appEnv: "development" }),
  );

  await assert.rejects(
    service.update(
      "smtp_email",
      {
        config: {
          password: "SuperSecret123!",
        },
      },
      {
        id: "user-1",
        systemRoles: ["super_admin"],
      } as any,
      { id: "org-1" } as any,
    ),
    /CONFIG_ENCRYPTION_KEY is not configured\. Set it before saving SMTP or other sensitive connector secrets\./,
  );
});

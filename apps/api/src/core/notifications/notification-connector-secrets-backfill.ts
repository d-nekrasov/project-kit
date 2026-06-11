import { Prisma } from "@prisma/client";
import { ConfigEncryptionService } from "../../common/security/config-encryption.service";

const SENSITIVE_CONNECTOR_CONFIG_KEYS = new Set([
  "password",
  "token",
  "apiKey",
  "secret",
]);

type NotificationConnectorRecord = {
  id: string;
  code: string;
  config: Prisma.JsonValue;
};

type NotificationConnectorRepository = {
  findMany(args: {
    select: { id: true; code: true; config: true };
  }): Promise<NotificationConnectorRecord[]>;
  update(args: {
    where: { id: string };
    data: { config: Prisma.InputJsonValue | typeof Prisma.JsonNull };
  }): Promise<unknown>;
};

export type NotificationConnectorSecretsBackfillResult = {
  scanned: number;
  updated: number;
  skipped: number;
};

export async function backfillNotificationConnectorSecrets(
  notificationConnectorRepository: NotificationConnectorRepository,
  configEncryptionService: ConfigEncryptionService,
): Promise<NotificationConnectorSecretsBackfillResult> {
  const connectors = await notificationConnectorRepository.findMany({
    select: {
      id: true,
      code: true,
      config: true,
    },
  });

  let updated = 0;
  let skipped = 0;

  for (const connector of connectors) {
    const nextConfig = encryptPlaintextSecrets(
      connector.config,
      configEncryptionService,
    );

    if (!nextConfig.changed) {
      skipped += 1;
      continue;
    }

    await notificationConnectorRepository.update({
      where: { id: connector.id },
      data: {
        config:
          nextConfig.value === null
            ? Prisma.JsonNull
            : (nextConfig.value as Prisma.InputJsonValue),
      },
    });
    updated += 1;
  }

  return {
    scanned: connectors.length,
    updated,
    skipped,
  };
}

function encryptPlaintextSecrets(
  config: Prisma.JsonValue,
  configEncryptionService: ConfigEncryptionService,
): { changed: boolean; value: Record<string, unknown> | null } {
  if (!config || typeof config !== "object" || Array.isArray(config)) {
    return { changed: false, value: null };
  }

  const nextConfig: Record<string, unknown> = { ...(config as Record<string, unknown>) };
  let changed = false;

  for (const key of Object.keys(nextConfig)) {
    const value = nextConfig[key];
    if (
      !SENSITIVE_CONNECTOR_CONFIG_KEYS.has(key) ||
      typeof value !== "string" ||
      value.length === 0 ||
      configEncryptionService.isEncrypted(value)
    ) {
      continue;
    }

    nextConfig[key] = configEncryptionService.encrypt(value);
    changed = true;
  }

  return {
    changed,
    value: nextConfig,
  };
}

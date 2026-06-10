import { ConfigService } from "@nestjs/config";
import { PrismaClient } from "@prisma/client";
import { ConfigEncryptionService } from "../src/common/security/config-encryption.service";
import { backfillNotificationConnectorSecrets } from "../src/core/notifications/notification-connector-secrets-backfill";

async function main(): Promise<void> {
  const prisma = new PrismaClient();

  try {
    const configEncryptionService = new ConfigEncryptionService(
      new ConfigService(process.env),
    );
    const result = await backfillNotificationConnectorSecrets(
      prisma.notificationConnector,
      configEncryptionService,
    );

    console.info(
      `Notification connector secret backfill finished: scanned=${result.scanned} updated=${result.updated} skipped=${result.skipped}`,
    );
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`Notification connector secret backfill failed: ${message}`);
  process.exitCode = 1;
});

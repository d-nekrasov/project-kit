-- AlterTable
ALTER TABLE "AuditLog"
ADD COLUMN "entityType" TEXT NOT NULL DEFAULT 'unknown',
ADD COLUMN "entityId" TEXT,
ADD COLUMN "metadata" JSONB,
ADD COLUMN "ip" TEXT,
ADD COLUMN "userAgent" TEXT;

-- Migrate payload -> metadata (if payload contains data)
UPDATE "AuditLog"
SET "metadata" = COALESCE("metadata", "payload")
WHERE "payload" IS NOT NULL;

-- Drop legacy payload column
ALTER TABLE "AuditLog" DROP COLUMN "payload";

-- CreateIndex
CREATE INDEX "AuditLog_userId_idx" ON "AuditLog"("userId");
CREATE INDEX "AuditLog_organizationId_idx" ON "AuditLog"("organizationId");
CREATE INDEX "AuditLog_action_idx" ON "AuditLog"("action");
CREATE INDEX "AuditLog_entityType_idx" ON "AuditLog"("entityType");
CREATE INDEX "AuditLog_createdAt_idx" ON "AuditLog"("createdAt");

-- AddForeignKey
ALTER TABLE "AuditLog"
ADD CONSTRAINT "AuditLog_organizationId_fkey"
FOREIGN KEY ("organizationId") REFERENCES "Organization"("id")
ON DELETE SET NULL ON UPDATE CASCADE;

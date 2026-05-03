-- CreateEnum
CREATE TYPE "SystemLogLevel" AS ENUM ('DEBUG', 'INFO', 'WARN', 'ERROR', 'FATAL');

-- AlterTable
ALTER TABLE "SystemLog"
ADD COLUMN "errorStack" TEXT,
ADD COLUMN "organizationId" TEXT,
ADD COLUMN "source" TEXT NOT NULL DEFAULT 'system',
ADD COLUMN "userId" TEXT;

-- Migrate level values into enum-safe values
UPDATE "SystemLog"
SET "level" = CASE UPPER("level")
  WHEN 'DEBUG' THEN 'DEBUG'
  WHEN 'INFO' THEN 'INFO'
  WHEN 'WARN' THEN 'WARN'
  WHEN 'WARNING' THEN 'WARN'
  WHEN 'ERROR' THEN 'ERROR'
  WHEN 'FATAL' THEN 'FATAL'
  ELSE 'ERROR'
END;

-- Alter level to enum
ALTER TABLE "SystemLog"
ALTER COLUMN "level" TYPE "SystemLogLevel" USING ("level"::"SystemLogLevel");

-- Align id default
ALTER TABLE "SystemLog" ALTER COLUMN "id" SET DEFAULT gen_random_uuid();

-- CreateIndex
CREATE INDEX "SystemLog_level_idx" ON "SystemLog"("level");
CREATE INDEX "SystemLog_source_idx" ON "SystemLog"("source");
CREATE INDEX "SystemLog_userId_idx" ON "SystemLog"("userId");
CREATE INDEX "SystemLog_organizationId_idx" ON "SystemLog"("organizationId");
CREATE INDEX "SystemLog_createdAt_idx" ON "SystemLog"("createdAt");

-- AddForeignKey
ALTER TABLE "SystemLog"
ADD CONSTRAINT "SystemLog_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "User"("id")
ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "SystemLog"
ADD CONSTRAINT "SystemLog_organizationId_fkey"
FOREIGN KEY ("organizationId") REFERENCES "Organization"("id")
ON DELETE SET NULL ON UPDATE CASCADE;

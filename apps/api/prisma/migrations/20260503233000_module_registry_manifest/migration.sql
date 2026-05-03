-- Add manifest metadata to ModuleRegistry
ALTER TABLE "ModuleRegistry"
ADD COLUMN "title" TEXT,
ADD COLUMN "version" TEXT,
ADD COLUMN "description" TEXT,
ADD COLUMN "manifest" JSONB,
ADD COLUMN "installedAt" TIMESTAMP(3);

-- Backfill title/version from existing data
UPDATE "ModuleRegistry"
SET
  "title" = COALESCE(NULLIF("name", ''), "code"),
  "version" = '0.1.0',
  "installedAt" = COALESCE("createdAt", CURRENT_TIMESTAMP);

ALTER TABLE "ModuleRegistry"
ALTER COLUMN "title" SET NOT NULL,
ALTER COLUMN "version" SET NOT NULL;

-- Use name as stable unique module key
UPDATE "ModuleRegistry"
SET "name" = "code"
WHERE "code" IS NOT NULL AND "code" <> '';

DROP INDEX IF EXISTS "ModuleRegistry_code_key";
CREATE UNIQUE INDEX "ModuleRegistry_name_key" ON "ModuleRegistry"("name");

ALTER TABLE "ModuleRegistry"
DROP COLUMN "code",
DROP COLUMN "isCore";

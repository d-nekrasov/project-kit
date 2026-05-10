DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'DocumentStatus') THEN
    CREATE TYPE "DocumentStatus" AS ENUM ('DRAFT', 'PUBLISHED', 'ARCHIVED');
  END IF;
END $$;

ALTER TABLE "Document"
  ADD COLUMN IF NOT EXISTS "status" "DocumentStatus" NOT NULL DEFAULT 'DRAFT',
  ADD COLUMN IF NOT EXISTS "createdById" TEXT,
  ADD COLUMN IF NOT EXISTS "updatedById" TEXT;

UPDATE "Document"
SET "createdById" = (
  SELECT "id" FROM "User" ORDER BY "createdAt" ASC LIMIT 1
)
WHERE "createdById" IS NULL;

ALTER TABLE "Document"
  ALTER COLUMN "createdById" SET NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'Document_createdById_fkey'
  ) THEN
    ALTER TABLE "Document"
      ADD CONSTRAINT "Document_createdById_fkey"
      FOREIGN KEY ("createdById") REFERENCES "User"("id")
      ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'Document_updatedById_fkey'
  ) THEN
    ALTER TABLE "Document"
      ADD CONSTRAINT "Document_updatedById_fkey"
      FOREIGN KEY ("updatedById") REFERENCES "User"("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS "Document_organizationId_idx" ON "Document"("organizationId");
CREATE INDEX IF NOT EXISTS "Document_status_idx" ON "Document"("status");
CREATE INDEX IF NOT EXISTS "Document_createdById_idx" ON "Document"("createdById");
CREATE INDEX IF NOT EXISTS "Document_updatedById_idx" ON "Document"("updatedById");
CREATE INDEX IF NOT EXISTS "Document_createdAt_idx" ON "Document"("createdAt");

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'AuditLog'
      AND column_name = 'entityType'
  ) THEN
    ALTER TABLE "AuditLog" ALTER COLUMN "entityType" DROP DEFAULT;
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'SystemLog'
      AND column_name = 'source'
  ) THEN
    ALTER TABLE "SystemLog"
      ALTER COLUMN "id" DROP DEFAULT,
      ALTER COLUMN "source" DROP DEFAULT;
  ELSE
    ALTER TABLE "SystemLog"
      ALTER COLUMN "id" DROP DEFAULT;
  END IF;
END $$;

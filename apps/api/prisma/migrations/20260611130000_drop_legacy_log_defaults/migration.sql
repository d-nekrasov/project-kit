-- Reconcile migration history with schema.prisma: legacy migrations left
-- DB-level defaults that the schema does not declare (Prisma generates
-- uuid()/values client-side). DROP DEFAULT is a no-op when no default exists,
-- so this is safe on databases already in the target state.
ALTER TABLE "AuditLog" ALTER COLUMN "entityType" DROP DEFAULT;

ALTER TABLE "SystemLog"
  ALTER COLUMN "id" DROP DEFAULT,
  ALTER COLUMN "source" DROP DEFAULT;

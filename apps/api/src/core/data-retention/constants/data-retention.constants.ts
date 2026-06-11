// Defaults apply when the corresponding env variable is not set.
// A value of 0 disables retention for that entity (rows are kept forever).
export const DEFAULT_RETENTION_SYSTEM_LOGS_DAYS = 90;
export const DEFAULT_RETENTION_AUDIT_LOGS_DAYS = 365;
export const DEFAULT_RETENTION_NOTIFICATIONS_DAYS = 90;
export const DEFAULT_RETENTION_CLEANUP_INTERVAL_MS = 3_600_000;
export const DEFAULT_RETENTION_CLEANUP_BATCH_SIZE = 5_000;

// Used or expired password reset tokens are always cleaned after this many days.
export const PASSWORD_RESET_TOKEN_RETENTION_DAYS = 30;

// Key for the Postgres advisory lock that guarantees a single cleanup run
// across all API instances. Acquired as a transaction-level lock
// (pg_try_advisory_xact_lock) so it can never leak if the process dies mid-run.
export const DATA_RETENTION_LOCK_KEY = 'data-retention.cleanup';

// Pause between delete batches so the cleanup does not saturate the database.
export const DATA_RETENTION_BATCH_PAUSE_MS = 100;

// The advisory lock is held by an otherwise empty interactive transaction while
// batched deletes run in autocommit mode on the pool. This caps how long a
// single cleanup run may take before the lock transaction is rolled back.
export const DATA_RETENTION_LOCK_TIMEOUT_MS = 30 * 60_000;
export const DATA_RETENTION_LOCK_MAX_WAIT_MS = 5_000;

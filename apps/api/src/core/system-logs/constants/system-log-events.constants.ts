export const SYSTEM_LOG_EVENTS = {
  CASBIN_RELOAD_FAILED: 'casbin.reload_failed',
  CASBIN_ENFORCE_FAILED: 'casbin.enforce_failed',
  AUDIT_WRITE_FAILED: 'audit.write_failed',
  INSTALLER_SETUP_FAILED: 'installer.setup_failed',
  INSTALLER_POLICY_RELOAD_FAILED: 'installer.policy_reload_failed',
  SYSTEM_LOG_WRITE_FAILED: 'system_log.write_failed'
} as const;

export const TOKEN_BLACKLIST_STORE = Symbol("TOKEN_BLACKLIST_STORE");

export interface TokenBlacklistStore {
  revoke(jti: string, ttlMs: number): Promise<void>;
  isRevoked(jti: string): Promise<boolean>;
}

import { Inject, Injectable, Optional } from "@nestjs/common";
import { TokenBlacklistStore } from "./token-blacklist-store.interface";

type RevocationEntry = {
  expiresAtMs: number;
};

export const IN_MEMORY_TOKEN_BLACKLIST_CLOCK = "IN_MEMORY_TOKEN_BLACKLIST_CLOCK";

@Injectable()
export class InMemoryTokenBlacklistStore implements TokenBlacklistStore {
  private readonly revokedTokens = new Map<string, RevocationEntry>();

  constructor(
    @Optional()
    @Inject(IN_MEMORY_TOKEN_BLACKLIST_CLOCK)
    private readonly now: () => number = () => Date.now(),
  ) {}

  async revoke(jti: string, ttlMs: number): Promise<void> {
    if (ttlMs <= 0) {
      return;
    }

    this.cleanupExpired();
    this.revokedTokens.set(jti, { expiresAtMs: this.now() + ttlMs });
  }

  async isRevoked(jti: string): Promise<boolean> {
    this.cleanupExpired();
    const entry = this.revokedTokens.get(jti);
    if (!entry) {
      return false;
    }

    if (entry.expiresAtMs <= this.now()) {
      this.revokedTokens.delete(jti);
      return false;
    }

    return true;
  }

  private cleanupExpired(): void {
    const currentTime = this.now();
    for (const [jti, entry] of this.revokedTokens.entries()) {
      if (entry.expiresAtMs <= currentTime) {
        this.revokedTokens.delete(jti);
      }
    }
  }
}

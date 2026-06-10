import { Injectable } from "@nestjs/common";
import { createHash } from "node:crypto";

type RevocationEntry = {
  expiresAtMs: number;
};

@Injectable()
export class TokenBlacklistService {
  private readonly revokedTokens = new Map<string, RevocationEntry>();

  revoke(tokenOrJti: string, expiresAt: Date): void {
    const expiresAtMs = expiresAt.getTime();
    if (expiresAtMs <= Date.now()) {
      return;
    }

    this.cleanupExpired();
    this.revokedTokens.set(this.buildStorageKey(tokenOrJti), { expiresAtMs });
  }

  isRevoked(tokenOrJti: string): boolean {
    this.cleanupExpired();
    const entry = this.revokedTokens.get(this.buildStorageKey(tokenOrJti));
    if (!entry) {
      return false;
    }

    if (entry.expiresAtMs <= Date.now()) {
      this.revokedTokens.delete(this.buildStorageKey(tokenOrJti));
      return false;
    }

    return true;
  }

  private cleanupExpired(): void {
    const now = Date.now();
    for (const [key, entry] of this.revokedTokens.entries()) {
      if (entry.expiresAtMs <= now) {
        this.revokedTokens.delete(key);
      }
    }
  }

  private buildStorageKey(tokenOrJti: string): string {
    if (tokenOrJti.includes(".")) {
      return `token:${createHash("sha256").update(tokenOrJti).digest("hex")}`;
    }

    return `jti:${tokenOrJti}`;
  }
}

import { Inject, Injectable, Optional } from "@nestjs/common";
import {
  TOKEN_BLACKLIST_STORE,
  TokenBlacklistStore,
} from "./stores/token-blacklist-store.interface";

export const TOKEN_BLACKLIST_CLOCK = "TOKEN_BLACKLIST_CLOCK";

@Injectable()
export class TokenBlacklistService {
  constructor(
    @Inject(TOKEN_BLACKLIST_STORE)
    private readonly tokenBlacklistStore: TokenBlacklistStore,
    @Optional()
    @Inject(TOKEN_BLACKLIST_CLOCK)
    private readonly now: () => number = () => Date.now(),
  ) {}

  async revoke(jti: string, expiresAt: Date): Promise<void> {
    const ttlMs = expiresAt.getTime() - this.now();
    if (ttlMs <= 0) {
      return;
    }

    await this.tokenBlacklistStore.revoke(jti, ttlMs);
  }

  isRevoked(jti: string): Promise<boolean> {
    return this.tokenBlacklistStore.isRevoked(jti);
  }
}

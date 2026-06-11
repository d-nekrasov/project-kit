import { Inject, Injectable, Optional } from "@nestjs/common";
import { CurrentUser } from "../types/current-user.type";
import { CurrentUserCacheStore } from "./current-user-cache-store.interface";

type CacheEntry = {
  user: CurrentUser;
  expiresAtMs: number;
};

export const IN_MEMORY_CURRENT_USER_CACHE_CLOCK =
  "IN_MEMORY_CURRENT_USER_CACHE_CLOCK";

@Injectable()
export class InMemoryCurrentUserCacheStore implements CurrentUserCacheStore {
  private readonly entries = new Map<string, CacheEntry>();

  constructor(
    @Optional()
    @Inject(IN_MEMORY_CURRENT_USER_CACHE_CLOCK)
    private readonly now: () => number = () => Date.now(),
  ) {}

  async get(userId: string): Promise<CurrentUser | null> {
    this.cleanupExpired();
    const entry = this.entries.get(userId);
    if (!entry) {
      return null;
    }

    if (entry.expiresAtMs <= this.now()) {
      this.entries.delete(userId);
      return null;
    }

    return structuredClone(entry.user);
  }

  async set(userId: string, user: CurrentUser, ttlMs: number): Promise<void> {
    if (ttlMs <= 0) {
      return;
    }

    this.cleanupExpired();
    this.entries.set(userId, {
      user: structuredClone(user),
      expiresAtMs: this.now() + ttlMs,
    });
  }

  async invalidate(userId: string): Promise<void> {
    this.entries.delete(userId);
  }

  async invalidateAll(): Promise<void> {
    this.entries.clear();
  }

  private cleanupExpired(): void {
    const currentTime = this.now();
    for (const [userId, entry] of this.entries.entries()) {
      if (entry.expiresAtMs <= currentTime) {
        this.entries.delete(userId);
      }
    }
  }
}

import { Inject, Injectable, Optional } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { parseIntegerEnv } from "../../common/utils/env.util";
import {
  CURRENT_USER_CACHE_STORE,
  CurrentUserCacheStore,
} from "./stores/current-user-cache-store.interface";
import { CurrentUser } from "./types/current-user.type";

export const DEFAULT_CURRENT_USER_CACHE_TTL_MS = 10_000;

@Injectable()
export class CurrentUserCacheService {
  private readonly ttlMs: number;

  constructor(
    @Optional()
    @Inject(CURRENT_USER_CACHE_STORE)
    private readonly store: CurrentUserCacheStore | null,
    configService: ConfigService,
  ) {
    this.ttlMs = parseIntegerEnv(
      configService.get<string>("AUTH_CURRENT_USER_CACHE_TTL_MS"),
      DEFAULT_CURRENT_USER_CACHE_TTL_MS,
    );
  }

  isEnabled(): boolean {
    return this.ttlMs > 0 && this.store !== null;
  }

  async get(userId: string): Promise<CurrentUser | null> {
    if (!this.isEnabled()) {
      return null;
    }

    return this.store!.get(userId);
  }

  async set(userId: string, user: CurrentUser): Promise<void> {
    if (!this.isEnabled()) {
      return;
    }

    await this.store!.set(userId, user, this.ttlMs);
  }

  async invalidate(userId: string): Promise<void> {
    if (!this.isEnabled()) {
      return;
    }

    await this.store!.invalidate(userId);
  }

  async invalidateAll(): Promise<void> {
    if (!this.isEnabled()) {
      return;
    }

    await this.store!.invalidateAll();
  }
}

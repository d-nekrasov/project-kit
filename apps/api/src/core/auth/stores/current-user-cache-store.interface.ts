import { CurrentUser } from "../types/current-user.type";

export const CURRENT_USER_CACHE_STORE = "CURRENT_USER_CACHE_STORE";

export interface CurrentUserCacheStore {
  get(userId: string): Promise<CurrentUser | null>;
  set(userId: string, user: CurrentUser, ttlMs: number): Promise<void>;
  invalidate(userId: string): Promise<void>;
  invalidateAll(): Promise<void>;
}

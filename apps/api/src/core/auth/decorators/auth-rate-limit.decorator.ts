import { SetMetadata } from "@nestjs/common";

export type AuthRateLimitOptions = {
  key: string;
  limit: number;
  ttlMs: number;
};

export const AUTH_RATE_LIMIT_OPTIONS = "auth:rate-limit-options";

export const AuthRateLimit = (options: AuthRateLimitOptions) =>
  SetMetadata(AUTH_RATE_LIMIT_OPTIONS, options);

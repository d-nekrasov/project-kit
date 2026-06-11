import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";

const DEFAULT_AUTH_COOKIE_NAME = "project_kit_auth";
const DEFAULT_AUTH_COOKIE_SAME_SITE = "strict";

type SameSiteValue = "strict" | "lax" | "none";

@Injectable()
export class AuthCookieService {
  constructor(private readonly configService: ConfigService) {}

  getCookieName(): string {
    return (
      this.configService.get<string>("AUTH_COOKIE_NAME")?.trim() ||
      DEFAULT_AUTH_COOKIE_NAME
    );
  }

  getMaxAgeMs(): number {
    return parseDurationToMs(
      this.configService.get<string>("JWT_ACCESS_EXPIRES_IN") ?? "15m",
    );
  }

  buildAuthCookie(token: string): string {
    return this.serializeCookie(token, this.getMaxAgeMs());
  }

  buildClearedAuthCookie(): string {
    return this.serializeCookie("", 0);
  }

  extractTokenFromCookieHeader(cookieHeader?: string): string | null {
    if (!cookieHeader) {
      return null;
    }

    const cookieName = this.getCookieName();
    const cookies = cookieHeader.split(";");
    for (const cookie of cookies) {
      const [rawName, ...rawValue] = cookie.trim().split("=");
      if (rawName === cookieName) {
        return decodeURIComponent(rawValue.join("="));
      }
    }

    return null;
  }

  private serializeCookie(value: string, maxAgeMs: number): string {
    const maxAgeSeconds = Math.max(0, Math.floor(maxAgeMs / 1000));
    const sameSite = this.getSameSite();
    const secure = this.isSecureCookie();
    const expiresAt =
      maxAgeSeconds === 0 ? new Date(0) : new Date(Date.now() + maxAgeMs);
    const segments = [
      `${this.getCookieName()}=${encodeURIComponent(value)}`,
      "Path=/",
      "HttpOnly",
      `SameSite=${capitalizeSameSite(sameSite)}`,
      `Max-Age=${maxAgeSeconds}`,
      `Expires=${expiresAt.toUTCString()}`,
    ];

    if (secure) {
      segments.push("Secure");
    }

    return segments.join("; ");
  }

  private isSecureCookie(): boolean {
    const configured = this.configService.get<string>("AUTH_COOKIE_SECURE");
    if (configured !== undefined) {
      return configured.toLowerCase() === "true";
    }

    const appEnv = (
      this.configService.get<string>("APP_ENV") ?? "development"
    ).toLowerCase();
    return appEnv === "production";
  }

  private getSameSite(): SameSiteValue {
    const configured = (
      this.configService.get<string>("AUTH_COOKIE_SAME_SITE") ??
      DEFAULT_AUTH_COOKIE_SAME_SITE
    ).toLowerCase();

    if (configured === "lax" || configured === "none") {
      return configured;
    }

    return "strict";
  }
}

function capitalizeSameSite(value: SameSiteValue): "Strict" | "Lax" | "None" {
  if (value === "lax") {
    return "Lax";
  }
  if (value === "none") {
    return "None";
  }
  return "Strict";
}

function parseDurationToMs(value: string): number {
  const normalized = value.trim();
  if (!normalized) {
    return 15 * 60 * 1000;
  }

  if (/^\d+$/.test(normalized)) {
    return Number.parseInt(normalized, 10) * 1000;
  }

  const match = normalized.match(/^(\d+)(ms|s|m|h|d)$/i);
  if (!match) {
    return 15 * 60 * 1000;
  }

  const amount = Number.parseInt(match[1], 10);
  const unit = match[2].toLowerCase();
  const multipliers: Record<string, number> = {
    ms: 1,
    s: 1000,
    m: 60 * 1000,
    h: 60 * 60 * 1000,
    d: 24 * 60 * 60 * 1000,
  };

  return amount * multipliers[unit];
}

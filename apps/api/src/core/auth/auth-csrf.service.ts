import { ForbiddenException, Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { randomBytes } from "node:crypto";

const DEFAULT_CSRF_COOKIE_NAME = "XSRF-TOKEN";
const DEFAULT_CSRF_HEADER_NAME = "X-CSRF-Token";
const DEFAULT_EXCLUDED_PATHS = new Set([
  "/api/auth/login",
  "/api/auth/forgot-password",
  "/api/auth/reset-password",
  "/api/auth/reset-password/validate",
  "/api/installer/setup",
]);

type SameSiteValue = "strict" | "lax" | "none";

@Injectable()
export class AuthCsrfService {
  constructor(private readonly configService: ConfigService) {}

  generateToken(): string {
    return randomBytes(32).toString("hex");
  }

  getCookieName(): string {
    return (
      this.configService.get<string>("CSRF_COOKIE_NAME")?.trim() ||
      DEFAULT_CSRF_COOKIE_NAME
    );
  }

  getHeaderName(): string {
    return (
      this.configService.get<string>("CSRF_HEADER_NAME")?.trim() ||
      DEFAULT_CSRF_HEADER_NAME
    );
  }

  buildCsrfCookie(token: string): string {
    return this.serializeCookie(token, this.getMaxAgeMs());
  }

  buildClearedCsrfCookie(): string {
    return this.serializeCookie("", 0);
  }

  extractTokenFromCookieHeader(cookieHeader?: string): string | null {
    return extractCookieValue(cookieHeader, this.getCookieName());
  }

  extractTokenFromHeaders(
    headers: Record<string, string | string[] | undefined>,
  ): string | null {
    const headerName = this.getHeaderName().toLowerCase();
    const value = headers[headerName] ?? headers[this.getHeaderName()];
    return Array.isArray(value) ? value[0] ?? null : value ?? null;
  }

  isSafeMethod(method?: string): boolean {
    const normalizedMethod = method?.toUpperCase();
    return (
      normalizedMethod === "GET" ||
      normalizedMethod === "HEAD" ||
      normalizedMethod === "OPTIONS"
    );
  }

  isExcludedPath(path?: string): boolean {
    if (!path) {
      return false;
    }

    return DEFAULT_EXCLUDED_PATHS.has(path);
  }

  assertValidCsrf(
    headers: Record<string, string | string[] | undefined>,
    cookieHeader?: string,
  ): void {
    const csrfCookie = this.extractTokenFromCookieHeader(cookieHeader);
    const csrfHeader = this.extractTokenFromHeaders(headers);

    if (!csrfCookie || !csrfHeader || csrfCookie !== csrfHeader) {
      throw new ForbiddenException("Invalid CSRF token");
    }
  }

  private getMaxAgeMs(): number {
    return parseDurationToMs(
      this.configService.get<string>("JWT_ACCESS_EXPIRES_IN") ?? "15m",
    );
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
      this.configService.get<string>("AUTH_COOKIE_SAME_SITE") ?? "strict"
    ).toLowerCase();

    if (configured === "lax" || configured === "none") {
      return configured;
    }

    return "strict";
  }
}

function extractCookieValue(cookieHeader: string | undefined, name: string): string | null {
  if (!cookieHeader) {
    return null;
  }

  const cookies = cookieHeader.split(";");
  for (const cookie of cookies) {
    const [rawName, ...rawValue] = cookie.trim().split("=");
    if (rawName === name) {
      return decodeURIComponent(rawValue.join("="));
    }
  }

  return null;
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

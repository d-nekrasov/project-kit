import { ForbiddenException, Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { randomBytes } from "node:crypto";
import { parseDurationToMs } from "../../common/utils/duration.util";
import { extractCookieValue } from "./utils/cookie-value.util";

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

function capitalizeSameSite(value: SameSiteValue): "Strict" | "Lax" | "None" {
  if (value === "lax") {
    return "Lax";
  }
  if (value === "none") {
    return "None";
  }
  return "Strict";
}

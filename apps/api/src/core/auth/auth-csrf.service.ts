import {
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { JwtService } from "@nestjs/jwt";
import { createHmac, randomBytes } from "node:crypto";
import { parseDurationToMs } from "../../common/utils/duration.util";
import { AuthTransportService } from "./auth-transport.service";
import { JwtPayload } from "./types/jwt-payload.type";
import { extractCookieValue } from "./utils/cookie-value.util";
import { timingSafeStringEqual } from "./utils/timing-safe-compare.util";

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

const CSRF_KEY_DERIVATION_INFO = "csrf-key-v1";

@Injectable()
export class AuthCsrfService {
  constructor(
    private readonly configService: ConfigService,
    private readonly jwtService: JwtService,
    private readonly authTransportService: AuthTransportService,
  ) {}

  // Signed double-submit: токен = <random>.<hmac>, где
  // hmac = HMAC-SHA256(CSRF_SECRET, `${random}.${jti}`) — привязка к сессии.
  generateToken(jti: string): string {
    const random = randomBytes(32).toString("base64url");
    return `${random}.${this.computeHmac(random, jti)}`;
  }

  issueTokenForRequest(
    headers: Record<string, string | string[] | undefined>,
  ): string {
    const jti = this.extractJtiFromHeaders(headers);
    if (!jti) {
      throw new UnauthorizedException();
    }

    return this.generateToken(jti);
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

    if (
      !csrfCookie ||
      !csrfHeader ||
      !timingSafeStringEqual(csrfCookie, csrfHeader)
    ) {
      throw new ForbiddenException("Invalid CSRF token");
    }

    const jti = this.extractJtiFromHeaders(headers);
    if (!jti || !this.isTokenValidForSession(csrfHeader, jti)) {
      throw new ForbiddenException("Invalid CSRF token");
    }
  }

  private isTokenValidForSession(token: string, jti: string): boolean {
    const separatorIndex = token.indexOf(".");
    if (separatorIndex <= 0 || separatorIndex === token.length - 1) {
      return false;
    }

    const random = token.slice(0, separatorIndex);
    const providedHmac = token.slice(separatorIndex + 1);
    return timingSafeStringEqual(providedHmac, this.computeHmac(random, jti));
  }

  private extractJtiFromHeaders(
    headers: Record<string, string | string[] | undefined>,
  ): string | null {
    const accessToken = this.authTransportService.extractAccessToken(headers);
    if (!accessToken) {
      return null;
    }

    try {
      const payload = this.jwtService.verify<JwtPayload>(accessToken);
      return payload.jti ?? null;
    } catch {
      return null;
    }
  }

  private computeHmac(random: string, jti: string): string {
    return createHmac("sha256", this.getCsrfSecret())
      .update(`${random}.${jti}`)
      .digest("base64url");
  }

  private getCsrfSecret(): Buffer {
    const configured = this.configService.get<string>("CSRF_SECRET")?.trim();
    if (configured) {
      return Buffer.from(configured, "utf8");
    }

    // CSRF_SECRET не задан: деривируем независимый ключ от JWT_SECRET,
    // чтобы не требовать обязательный второй секрет в конфигурации.
    const jwtSecret = this.configService.get<string>("JWT_SECRET") ?? "";
    return createHmac("sha256", jwtSecret)
      .update(CSRF_KEY_DERIVATION_INFO)
      .digest();
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

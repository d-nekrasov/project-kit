import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import type { IncomingHttpHeaders } from "node:http";
import { AuthCookieService } from "./auth-cookie.service";
import { extractBearerTokenFromHeaders } from "./utils/auth-token-extractor";

type HeadersLike = IncomingHttpHeaders | Record<string, string | string[] | undefined>;

export type AuthTransport = "cookie" | "bearer" | "none";

@Injectable()
export class AuthTransportService {
  constructor(
    private readonly configService: ConfigService,
    private readonly authCookieService: AuthCookieService,
  ) {}

  isBearerEnabled(): boolean {
    const configured = this.configService.get<string>("AUTH_BEARER_ENABLED");
    if (configured !== undefined) {
      return configured.toLowerCase() === "true";
    }

    const appEnv = (
      this.configService.get<string>("APP_ENV") ?? "development"
    ).toLowerCase();
    return appEnv !== "production";
  }

  detectTransport(headers: HeadersLike): AuthTransport {
    const bearerToken = extractBearerTokenFromHeaders(
      headers,
      this.isBearerEnabled(),
    );
    if (bearerToken) {
      return "bearer";
    }

    const cookieHeader = Array.isArray(headers.cookie)
      ? headers.cookie[0]
      : headers.cookie;
    if (this.authCookieService.extractTokenFromCookieHeader(cookieHeader)) {
      return "cookie";
    }

    return "none";
  }

  extractAccessToken(headers: HeadersLike): string | null {
    const bearerToken = extractBearerTokenFromHeaders(
      headers,
      this.isBearerEnabled(),
    );
    if (bearerToken) {
      return bearerToken;
    }

    const cookieHeader = Array.isArray(headers.cookie)
      ? headers.cookie[0]
      : headers.cookie;
    return this.authCookieService.extractTokenFromCookieHeader(cookieHeader);
  }
}

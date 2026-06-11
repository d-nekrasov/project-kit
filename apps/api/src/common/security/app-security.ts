import { ForbiddenException, INestApplication, Logger, ValidationPipe } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { CorsOptions } from "@nestjs/common/interfaces/external/cors-options.interface";
import helmet from "helmet";
import { resolveTrustProxy } from "../utils/trust-proxy.util";

const DEV_LOCALHOST_ORIGIN_PATTERN =
  /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/i;
const DEFAULT_AUTH_COOKIE_NAME = "project_kit_auth";
const DEFAULT_CSRF_COOKIE_NAME = "XSRF-TOKEN";
const DEFAULT_CSRF_HEADER_NAME = "X-CSRF-Token";
const CSRF_EXCLUDED_PATHS = new Set([
  "/api/auth/login",
  "/api/auth/forgot-password",
  "/api/auth/reset-password",
  "/api/auth/reset-password/validate",
  "/api/installer/setup",
]);

export function parseAllowedOrigins(
  allowedOriginsValue: string | undefined,
): string[] {
  return (allowedOriginsValue ?? "")
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);
}

export function buildCorsOptions(configService: ConfigService): CorsOptions {
  const logger = new Logger("AppSecurity");
  const appEnv = (
    configService.get<string>("APP_ENV") ?? "development"
  ).toLowerCase();
  const isProduction = appEnv === "production";
  const configuredOrigins = parseAllowedOrigins(
    configService.get<string>("ALLOWED_ORIGINS"),
  );
  const allowedOrigins = isProduction
    ? configuredOrigins
    : configuredOrigins.filter((origin) =>
        DEV_LOCALHOST_ORIGIN_PATTERN.test(origin),
      );
  const allowedOriginSet = new Set(allowedOrigins);

  if (isProduction && configuredOrigins.length === 0) {
    // Fail closed in production so a missing env var cannot silently expose the API cross-origin.
    throw new Error(
      "ALLOWED_ORIGINS must be configured in production to enable CORS safely.",
    );
  }

  if (!isProduction) {
    const invalidDevOrigins = configuredOrigins.filter(
      (origin) => !DEV_LOCALHOST_ORIGIN_PATTERN.test(origin),
    );
    if (invalidDevOrigins.length > 0) {
      logger.warn(
        `Ignoring non-localhost ALLOWED_ORIGINS entries in development: ${invalidDevOrigins.join(", ")}`,
      );
    }
  }

  return {
    origin(origin, callback) {
      if (!origin) {
        callback(null, true);
        return;
      }

      if (allowedOriginSet.has(origin)) {
        callback(null, true);
        return;
      }

      callback(null, false);
    },
    credentials: true,
  };
}

export function configureApp(app: INestApplication): void {
  const configService = app.get(ConfigService);
  const httpAdapter = app.getHttpAdapter().getInstance();

  httpAdapter.set(
    "trust proxy",
    resolveTrustProxy(configService.get<string>("TRUST_PROXY")),
  );

  app.setGlobalPrefix("api");
  app.use(helmet());
  app.enableCors(buildCorsOptions(configService));
  app.use((
    req: { method?: string; path?: string; headers: Record<string, string | string[] | undefined> },
    _res: unknown,
    next: (error?: unknown) => void,
  ) => {
    if (isSafeMethod(req.method) || isCsrfExcludedPath(req.path)) {
      next();
      return;
    }

    if (detectAuthTransport(req.headers, configService) !== "cookie") {
      next();
      return;
    }

    const cookieHeader = Array.isArray(req.headers.cookie)
      ? req.headers.cookie[0]
      : req.headers.cookie;
    try {
      assertValidCsrf(req.headers, cookieHeader, configService);
      next();
    } catch (error) {
      next(error);
    }
  });
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
}

function isSafeMethod(method?: string): boolean {
  const normalizedMethod = method?.toUpperCase();
  return (
    normalizedMethod === "GET" ||
    normalizedMethod === "HEAD" ||
    normalizedMethod === "OPTIONS"
  );
}

function isCsrfExcludedPath(path?: string): boolean {
  return Boolean(path && CSRF_EXCLUDED_PATHS.has(path));
}

function detectAuthTransport(
  headers: Record<string, string | string[] | undefined>,
  configService: ConfigService,
): "cookie" | "bearer" | "none" {
  if (extractBearerToken(headers, configService)) {
    return "bearer";
  }

  const cookieHeader = Array.isArray(headers.cookie)
    ? headers.cookie[0]
    : headers.cookie;
  if (extractCookie(headersCookieName(configService), cookieHeader)) {
    return "cookie";
  }

  return "none";
}

function assertValidCsrf(
  headers: Record<string, string | string[] | undefined>,
  cookieHeader: string | undefined,
  configService: ConfigService,
): void {
  const csrfCookie = extractCookie(csrfCookieName(configService), cookieHeader);
  const csrfHeader = extractCsrfHeader(headers, configService);

  if (!csrfCookie || !csrfHeader || csrfCookie !== csrfHeader) {
    throw new ForbiddenException("Invalid CSRF token");
  }
}

function headersCookieName(configService: ConfigService): string {
  return (
    configService.get<string>("AUTH_COOKIE_NAME")?.trim() ||
    DEFAULT_AUTH_COOKIE_NAME
  );
}

function csrfCookieName(configService: ConfigService): string {
  return (
    configService.get<string>("CSRF_COOKIE_NAME")?.trim() ||
    DEFAULT_CSRF_COOKIE_NAME
  );
}

function extractCsrfHeader(
  headers: Record<string, string | string[] | undefined>,
  configService: ConfigService,
): string | null {
  const configuredName =
    configService.get<string>("CSRF_HEADER_NAME")?.trim() ||
    DEFAULT_CSRF_HEADER_NAME;
  const value = headers[configuredName] ?? headers[configuredName.toLowerCase()];
  return Array.isArray(value) ? value[0] ?? null : value ?? null;
}

function extractBearerToken(
  headers: Record<string, string | string[] | undefined>,
  configService: ConfigService,
): string | null {
  if (!isBearerEnabled(configService)) {
    return null;
  }

  const authorization = headers.authorization;
  const value = Array.isArray(authorization) ? authorization[0] : authorization;
  if (!value) {
    return null;
  }

  const [scheme, token] = value.split(" ");
  if (scheme?.toLowerCase() !== "bearer" || !token) {
    return null;
  }

  return token;
}

function isBearerEnabled(configService: ConfigService): boolean {
  const configured = configService.get<string>("AUTH_BEARER_ENABLED");
  if (configured !== undefined) {
    return configured.toLowerCase() === "true";
  }

  const appEnv = (
    configService.get<string>("APP_ENV") ?? "development"
  ).toLowerCase();
  return appEnv !== "production";
}

function extractCookie(name: string, cookieHeader?: string): string | null {
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

import { INestApplication, Logger, ValidationPipe } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { CorsOptions } from "@nestjs/common/interfaces/external/cors-options.interface";
import helmet from "helmet";
import { AuthCsrfService } from "../../core/auth/auth-csrf.service";
import { AuthTransportService } from "../../core/auth/auth-transport.service";
import { resolveTrustProxy } from "../utils/trust-proxy.util";

const DEV_LOCALHOST_ORIGIN_PATTERN =
  /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/i;

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

type CsrfMiddlewareRequest = {
  method?: string;
  path?: string;
  headers: Record<string, string | string[] | undefined>;
};

export type CsrfMiddleware = (
  req: CsrfMiddlewareRequest,
  res: unknown,
  next: (error?: unknown) => void,
) => void;

export function createCsrfMiddleware(
  authCsrfService: Pick<
    AuthCsrfService,
    "isSafeMethod" | "isExcludedPath" | "assertValidCsrf"
  >,
  authTransportService: Pick<AuthTransportService, "detectTransport">,
): CsrfMiddleware {
  return (req, _res, next) => {
    if (
      authCsrfService.isSafeMethod(req.method) ||
      authCsrfService.isExcludedPath(req.path)
    ) {
      next();
      return;
    }

    if (authTransportService.detectTransport(req.headers) !== "cookie") {
      next();
      return;
    }

    const cookieHeader = Array.isArray(req.headers.cookie)
      ? req.headers.cookie[0]
      : req.headers.cookie;
    try {
      authCsrfService.assertValidCsrf(req.headers, cookieHeader);
      next();
    } catch (error) {
      next(error);
    }
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
  app.use(
    createCsrfMiddleware(app.get(AuthCsrfService), app.get(AuthTransportService)),
  );
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
}

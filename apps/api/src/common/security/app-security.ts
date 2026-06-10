import { INestApplication, Logger, ValidationPipe } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { CorsOptions } from "@nestjs/common/interfaces/external/cors-options.interface";
import helmet from "helmet";

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
    credentials: false, // TODO: Switch to credentials=true when cookie-based auth is introduced.
  };
}

export function configureApp(app: INestApplication): void {
  const configService = app.get(ConfigService);

  app.setGlobalPrefix("api");
  app.use(helmet());
  app.enableCors(buildCorsOptions(configService));
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
}

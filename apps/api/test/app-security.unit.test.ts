import assert from "node:assert/strict";
import { test } from "node:test";

import { ConfigService } from "@nestjs/config";

import {
  buildCorsOptions,
  parseAllowedOrigins,
} from "../src/common/security/app-security";

test("parseAllowedOrigins splits comma-separated values safely", () => {
  assert.deepEqual(
    parseAllowedOrigins(" http://localhost:5173, http://localhost:3000 ,,"),
    ["http://localhost:5173", "http://localhost:3000"],
  );
});

test("buildCorsOptions allows configured origins and denies others", async () => {
  const configService = new ConfigService({
    APP_ENV: "development",
    ALLOWED_ORIGINS: "http://localhost:5173,http://localhost:3000",
  });
  const corsOptions = buildCorsOptions(configService);

  const allowed = await new Promise<boolean>((resolve, reject) => {
    corsOptions.origin?.("http://localhost:5173", (error, value) => {
      if (error) {
        reject(error);
        return;
      }
      resolve(Boolean(value));
    });
  });
  const denied = await new Promise<boolean>((resolve, reject) => {
    corsOptions.origin?.("https://evil.example", (error, value) => {
      if (error) {
        reject(error);
        return;
      }
      resolve(Boolean(value));
    });
  });

  assert.equal(allowed, true);
  assert.equal(denied, false);
  assert.equal(corsOptions.credentials, false);
});

test("buildCorsOptions fails closed in production when ALLOWED_ORIGINS is missing", () => {
  const configService = new ConfigService({
    APP_ENV: "production",
  });

  assert.throws(
    () => buildCorsOptions(configService),
    /ALLOWED_ORIGINS must be configured in production/,
  );
});

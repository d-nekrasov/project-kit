import assert from "node:assert/strict";
import { test } from "node:test";

import { ConfigService } from "@nestjs/config";

import { AuthCookieService } from "../src/core/auth/auth-cookie.service";
import { AuthTransportService } from "../src/core/auth/auth-transport.service";

function createService(config: Record<string, string>) {
  const configService = new ConfigService(config);
  return new AuthTransportService(
    configService,
    new AuthCookieService(configService),
  );
}

test("AuthTransportService enables bearer by default outside production and disables it in production", () => {
  assert.equal(
    createService({ APP_ENV: "development" }).isBearerEnabled(),
    true,
  );
  assert.equal(
    createService({ APP_ENV: "production" }).isBearerEnabled(),
    false,
  );
});

test("AuthTransportService honors AUTH_BEARER_ENABLED override", () => {
  const disabled = createService({
    APP_ENV: "development",
    AUTH_BEARER_ENABLED: "false",
  });
  const enabled = createService({
    APP_ENV: "production",
    AUTH_BEARER_ENABLED: "true",
  });

  assert.equal(disabled.extractAccessToken({ authorization: "Bearer token" }), null);
  assert.equal(enabled.extractAccessToken({ authorization: "Bearer token" }), "token");
});

test("AuthTransportService.isBearerResponseRequested requires both the header and enabled bearer transport", () => {
  const enabled = createService({ APP_ENV: "development" });

  assert.equal(enabled.isBearerResponseRequested({}), false);
  assert.equal(
    enabled.isBearerResponseRequested({ "x-auth-transport": "cookie" }),
    false,
  );
  assert.equal(
    enabled.isBearerResponseRequested({ "x-auth-transport": "bearer" }),
    true,
  );
  assert.equal(
    enabled.isBearerResponseRequested({ "x-auth-transport": " Bearer " }),
    true,
  );
  assert.equal(
    enabled.isBearerResponseRequested({ "x-auth-transport": ["bearer"] }),
    true,
  );
});

test("AuthTransportService.isBearerResponseRequested cannot override disabled bearer transport", () => {
  const disabled = createService({
    APP_ENV: "development",
    AUTH_BEARER_ENABLED: "false",
  });

  assert.equal(
    disabled.isBearerResponseRequested({ "x-auth-transport": "bearer" }),
    false,
  );
});

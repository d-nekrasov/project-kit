import assert from "node:assert/strict";
import { test } from "node:test";

import { ConfigService } from "@nestjs/config";
import { ForbiddenException } from "@nestjs/common";

import { AuthCsrfService } from "../src/core/auth/auth-csrf.service";

test("AuthCsrfService builds readable CSRF cookies and validates matching tokens", () => {
  const service = new AuthCsrfService(
    new ConfigService({
      APP_ENV: "development",
      JWT_ACCESS_EXPIRES_IN: "15m",
      AUTH_COOKIE_SAME_SITE: "strict",
      AUTH_COOKIE_SECURE: "false",
      CSRF_COOKIE_NAME: "XSRF-TOKEN",
      CSRF_HEADER_NAME: "X-CSRF-Token",
    }),
  );

  const token = service.generateToken();
  const cookie = service.buildCsrfCookie(token);
  assert.match(cookie, /^XSRF-TOKEN=/);
  assert.doesNotMatch(cookie, /HttpOnly/);
  assert.match(cookie, /SameSite=Strict/);

  service.assertValidCsrf(
    { "x-csrf-token": token },
    `XSRF-TOKEN=${token}; other=value`,
  );

  assert.throws(
    () => service.assertValidCsrf({ "x-csrf-token": "wrong" }, `XSRF-TOKEN=${token}`),
    ForbiddenException,
  );
});

test("AuthCsrfService defaults to secure cookies in production", () => {
  const service = new AuthCsrfService(
    new ConfigService({
      APP_ENV: "production",
      JWT_ACCESS_EXPIRES_IN: "15m",
    }),
  );

  const cookie = service.buildCsrfCookie("token");
  assert.match(cookie, /Secure/);
});

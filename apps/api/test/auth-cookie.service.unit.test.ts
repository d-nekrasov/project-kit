import assert from "node:assert/strict";
import { test } from "node:test";

import { ConfigService } from "@nestjs/config";

import { AuthCookieService } from "../src/core/auth/auth-cookie.service";

test("AuthCookieService builds httpOnly strict cookies and clears them safely", () => {
  const service = new AuthCookieService(
    new ConfigService({
      APP_ENV: "development",
      JWT_ACCESS_EXPIRES_IN: "15m",
      AUTH_COOKIE_NAME: "pk_auth",
      AUTH_COOKIE_SAME_SITE: "strict",
      AUTH_COOKIE_SECURE: "false",
    }),
  );

  const cookie = service.buildAuthCookie("token-value");
  assert.match(cookie, /^pk_auth=token-value;/);
  assert.match(cookie, /HttpOnly/);
  assert.match(cookie, /SameSite=Strict/);
  assert.match(cookie, /Max-Age=900/);
  assert.doesNotMatch(cookie, /Secure/);

  const cleared = service.buildClearedAuthCookie();
  assert.match(cleared, /Max-Age=0/);
  assert.equal(
    service.extractTokenFromCookieHeader("foo=bar; pk_auth=token-value"),
    "token-value",
  );
});

test("AuthCookieService enables secure cookies in production config", () => {
  const service = new AuthCookieService(
    new ConfigService({
      APP_ENV: "production",
      JWT_ACCESS_EXPIRES_IN: "15m",
      AUTH_COOKIE_SAME_SITE: "lax",
    }),
  );

  const cookie = service.buildAuthCookie("token-value");
  assert.match(cookie, /Secure/);
  assert.match(cookie, /SameSite=Lax/);
});

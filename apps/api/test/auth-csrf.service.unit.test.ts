import assert from "node:assert/strict";
import { test } from "node:test";

import { ConfigService } from "@nestjs/config";
import { ForbiddenException } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";

import { AuthCookieService } from "../src/core/auth/auth-cookie.service";
import { AuthCsrfService } from "../src/core/auth/auth-csrf.service";
import { AuthTransportService } from "../src/core/auth/auth-transport.service";
import { timingSafeStringEqual } from "../src/core/auth/utils/timing-safe-compare.util";

const JWT_SECRET = "unit-test-secret-unit-test-secret-0000";

function buildServices(configOverrides: Record<string, string> = {}) {
  const configService = new ConfigService({
    APP_ENV: "development",
    JWT_SECRET,
    JWT_ACCESS_EXPIRES_IN: "15m",
    AUTH_COOKIE_NAME: "project_kit_auth",
    AUTH_COOKIE_SAME_SITE: "strict",
    CSRF_COOKIE_NAME: "XSRF-TOKEN",
    CSRF_HEADER_NAME: "X-CSRF-Token",
    ...configOverrides,
  });
  const jwtService = new JwtService({ secret: JWT_SECRET });
  const transportService = new AuthTransportService(
    configService,
    new AuthCookieService(configService),
  );
  return {
    jwtService,
    csrfService: new AuthCsrfService(configService, jwtService, transportService),
  };
}

function signAccessToken(jwtService: JwtService, jti: string): string {
  return jwtService.sign({
    sub: "user-1",
    jti,
    email: "user@example.com",
    systemRoles: [],
    organizations: [],
  });
}

function buildRequest(accessToken: string, csrfCookie: string, csrfHeader: string) {
  const cookieHeader = `project_kit_auth=${accessToken}; XSRF-TOKEN=${csrfCookie}`;
  return {
    headers: {
      cookie: cookieHeader,
      "x-csrf-token": csrfHeader,
    },
    cookieHeader,
  };
}

test("AuthCsrfService builds readable CSRF cookies and accepts a token issued for the same session", () => {
  const { csrfService, jwtService } = buildServices();
  const accessToken = signAccessToken(jwtService, "session-1");
  const token = csrfService.issueTokenForRequest({
    cookie: `project_kit_auth=${accessToken}`,
  });

  assert.match(token, /^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/);

  const cookie = csrfService.buildCsrfCookie(token);
  assert.match(cookie, /^XSRF-TOKEN=/);
  assert.doesNotMatch(cookie, /HttpOnly/);
  assert.match(cookie, /SameSite=Strict/);

  const request = buildRequest(accessToken, token, token);
  csrfService.assertValidCsrf(request.headers, request.cookieHeader);
});

test("AuthCsrfService rejects a token issued for another session (jti mismatch)", () => {
  const { csrfService, jwtService } = buildServices();
  const tokenForOtherSession = csrfService.generateToken("session-other");
  const accessToken = signAccessToken(jwtService, "session-current");

  const request = buildRequest(accessToken, tokenForOtherSession, tokenForOtherSession);
  assert.throws(
    () => csrfService.assertValidCsrf(request.headers, request.cookieHeader),
    ForbiddenException,
  );
});

test("AuthCsrfService rejects forged, truncated and empty tokens", () => {
  const { csrfService, jwtService } = buildServices();
  const accessToken = signAccessToken(jwtService, "session-1");
  const validToken = csrfService.generateToken("session-1");
  const [random, hmac] = validToken.split(".");

  const forgedTokens = [
    `${random}.AAAA${hmac?.slice(4)}`, // подделанный hmac
    `XXXX${random?.slice(4)}.${hmac}`, // подделанный random
    validToken.slice(0, -2), // обрезанный
    random ?? "", // без hmac
    `.${hmac}`, // без random
    "",
    "not-a-token",
  ];

  for (const forged of forgedTokens) {
    const request = buildRequest(accessToken, forged, forged);
    assert.throws(
      () => csrfService.assertValidCsrf(request.headers, request.cookieHeader),
      ForbiddenException,
      `expected rejection for token: ${JSON.stringify(forged)}`,
    );
  }
});

test("AuthCsrfService rejects when cookie and header values differ", () => {
  const { csrfService, jwtService } = buildServices();
  const accessToken = signAccessToken(jwtService, "session-1");
  const token = csrfService.generateToken("session-1");
  const otherToken = csrfService.generateToken("session-1");

  const request = buildRequest(accessToken, token, otherToken);
  assert.throws(
    () => csrfService.assertValidCsrf(request.headers, request.cookieHeader),
    ForbiddenException,
  );

  assert.throws(
    () => csrfService.assertValidCsrf({ "x-csrf-token": token }, undefined),
    ForbiddenException,
  );
});

test("AuthCsrfService rejects when the access token is missing or unverifiable", () => {
  const { csrfService } = buildServices();
  const token = csrfService.generateToken("session-1");

  const noAuth = buildRequest("", token, token);
  assert.throws(
    () => csrfService.assertValidCsrf(noAuth.headers, noAuth.cookieHeader),
    ForbiddenException,
  );

  const brokenAuth = buildRequest("broken.jwt.value", token, token);
  assert.throws(
    () => csrfService.assertValidCsrf(brokenAuth.headers, brokenAuth.cookieHeader),
    ForbiddenException,
  );
});

test("AuthCsrfService honours an explicit CSRF_SECRET", () => {
  const { csrfService: serviceA, jwtService } = buildServices({
    CSRF_SECRET: "secret-a",
  });
  const { csrfService: serviceB } = buildServices({ CSRF_SECRET: "secret-b" });
  const accessToken = signAccessToken(jwtService, "session-1");
  const tokenFromA = serviceA.generateToken("session-1");

  const request = buildRequest(accessToken, tokenFromA, tokenFromA);
  serviceA.assertValidCsrf(request.headers, request.cookieHeader);
  assert.throws(
    () => serviceB.assertValidCsrf(request.headers, request.cookieHeader),
    ForbiddenException,
  );
});

test("AuthCsrfService defaults to secure cookies in production", () => {
  const { csrfService } = buildServices({ APP_ENV: "production" });

  const cookie = csrfService.buildCsrfCookie("token");
  assert.match(cookie, /Secure/);
});

test("timingSafeStringEqual compares without early exit and handles unequal lengths", () => {
  assert.equal(timingSafeStringEqual("abc", "abc"), true);
  assert.equal(timingSafeStringEqual("abc", "abd"), false);
  assert.equal(timingSafeStringEqual("abc", "abcd"), false);
  assert.equal(timingSafeStringEqual("", ""), true);
  assert.equal(timingSafeStringEqual("", "a"), false);
});

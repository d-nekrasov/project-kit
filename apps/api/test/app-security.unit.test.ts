import assert from "node:assert/strict";
import { test } from "node:test";

import { ForbiddenException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";

import {
  buildCorsOptions,
  createCsrfMiddleware,
  parseAllowedOrigins,
} from "../src/common/security/app-security";
import { AuthCsrfService } from "../src/core/auth/auth-csrf.service";
import { AuthTransportService } from "../src/core/auth/auth-transport.service";

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
  assert.equal(corsOptions.credentials, true);
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

type MiddlewareHeaders = Record<string, string | string[] | undefined>;

function buildCsrfServiceMock(excludedPaths: Set<string>) {
  const realCsrfService = new AuthCsrfService(new ConfigService({}));
  return {
    isSafeMethod: (method?: string) => realCsrfService.isSafeMethod(method),
    isExcludedPath: (path?: string) => Boolean(path && excludedPaths.has(path)),
    assertValidCsrf: (
      headers: MiddlewareHeaders,
      cookieHeader?: string,
    ) => realCsrfService.assertValidCsrf(headers, cookieHeader),
  };
}

function runMiddleware(
  middleware: ReturnType<typeof createCsrfMiddleware>,
  req: { method?: string; path?: string; headers: MiddlewareHeaders },
): unknown {
  let nextError: unknown;
  middleware(req, undefined, (error?: unknown) => {
    nextError = error;
  });
  return nextError;
}

test("csrf middleware skips safe methods and non-cookie transports", () => {
  const transportService = {
    detectTransport: () => "bearer" as const,
  };
  const middleware = createCsrfMiddleware(
    buildCsrfServiceMock(new Set()),
    transportService,
  );

  assert.equal(
    runMiddleware(middleware, { method: "GET", path: "/api/users", headers: {} }),
    undefined,
  );
  assert.equal(
    runMiddleware(middleware, { method: "POST", path: "/api/users", headers: {} }),
    undefined,
  );
});

test("csrf middleware rejects cookie-transport requests without a valid token", () => {
  const middleware = createCsrfMiddleware(
    buildCsrfServiceMock(new Set()),
    { detectTransport: () => "cookie" as const },
  );

  const error = runMiddleware(middleware, {
    method: "POST",
    path: "/api/users",
    headers: { cookie: "project_kit_auth=token" },
  });

  assert.ok(error instanceof ForbiddenException);
});

test("csrf middleware accepts cookie-transport requests with matching token", () => {
  const middleware = createCsrfMiddleware(
    buildCsrfServiceMock(new Set()),
    { detectTransport: () => "cookie" as const },
  );

  const error = runMiddleware(middleware, {
    method: "POST",
    path: "/api/users",
    headers: {
      cookie: "project_kit_auth=token; XSRF-TOKEN=csrf-value",
      "x-csrf-token": "csrf-value",
    },
  });

  assert.equal(error, undefined);
});

test("csrf middleware excluded paths come from AuthCsrfService", () => {
  const csrfService = new AuthCsrfService(new ConfigService({}));
  const transportService = { detectTransport: () => "cookie" as const };
  const request = {
    method: "POST",
    path: "/api/auth/login",
    headers: { cookie: "project_kit_auth=token" },
  };

  const realServiceMiddleware = createCsrfMiddleware(
    csrfService,
    transportService,
  );
  assert.equal(runMiddleware(realServiceMiddleware, request), undefined);

  const overriddenService = Object.create(csrfService) as AuthCsrfService;
  overriddenService.isExcludedPath = () => false;
  const overriddenMiddleware = createCsrfMiddleware(
    overriddenService,
    transportService,
  );
  assert.ok(
    runMiddleware(overriddenMiddleware, request) instanceof ForbiddenException,
  );
});

test("csrf middleware applies csrf checks only for cookie transport", () => {
  const detectedTransports: string[] = [];
  let transport: "cookie" | "bearer" | "none" = "none";
  const transportService: Pick<AuthTransportService, "detectTransport"> = {
    detectTransport: () => {
      detectedTransports.push(transport);
      return transport;
    },
  };
  const middleware = createCsrfMiddleware(
    buildCsrfServiceMock(new Set()),
    transportService,
  );
  const request = { method: "POST", path: "/api/users", headers: {} };

  assert.equal(runMiddleware(middleware, request), undefined);

  transport = "cookie";
  assert.ok(runMiddleware(middleware, request) instanceof ForbiddenException);
  assert.deepEqual(detectedTransports, ["none", "cookie"]);
});

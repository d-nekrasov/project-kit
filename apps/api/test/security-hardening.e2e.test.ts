import "reflect-metadata";

import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { after, before, test } from "node:test";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

import { INestApplication } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { Test } from "@nestjs/testing";
import { UserStatus } from "@prisma/client";

import { createProjectKitSdk } from "../../../packages/sdk/src/create-project-kit-sdk";
import { configureApp } from "../src/common/security/app-security";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const require = createRequire(import.meta.url);
const apiDir = resolve(__dirname, "..");
const repoRoot = resolve(apiDir, "..", "..");
const databaseName = `project_kit_security_${Date.now()}_${Math.random().toString(16).slice(2, 10)}`;
const databaseUrl = `postgresql://postgres:postgres@127.0.0.1:5432/${databaseName}?schema=public`;
const allowedOrigin = "http://localhost:5173";
const configEncryptionKey = "MDEyMzQ1Njc4OWFiY2RlZjAxMjM0NTY3ODlhYmNkZWY=";
const { AppModule } = require("../dist/src/app.module");
const { PrismaService } = require("../dist/src/infrastructure/prisma/prisma.service");

let app: INestApplication;
let prisma: InstanceType<typeof PrismaService>;
let jwtService: JwtService;
let baseUrl = "";
let adminToken = "";
let adminOrganizationId = "";
let ipCounter = 0;

function getCookieHeader(headers: Headers): string {
  const cookie = headers.get("set-cookie");
  assert.ok(cookie);
  return cookie;
}

function decodeJwtPayload(token: string): Record<string, unknown> {
  const [, payload] = token.split(".");
  assert.ok(payload);
  return JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as Record<string, unknown>;
}

function getSetCookie(headers: Headers): string {
  return getCookieHeader(headers);
}

function extractCookiePair(setCookieHeader: string): string {
  return setCookieHeader.split(";")[0] ?? setCookieHeader;
}

function mergeCookies(...cookiePairs: Array<string | undefined>): string {
  return cookiePairs.filter(Boolean).join("; ");
}

function runCommand(
  command: string,
  args: string[],
  cwd = apiDir,
  envOverrides?: Record<string, string>,
): void {
  execFileSync(command, args, {
    cwd,
    stdio: "pipe",
    env: {
      ...process.env,
      DATABASE_URL: databaseUrl,
      PGPASSWORD: "postgres",
      ...envOverrides,
    },
  });
}

function dropDatabase(name: string): void {
  runCommand(
    "psql",
    [
      "-h",
      "127.0.0.1",
      "-p",
      "5432",
      "-U",
      "postgres",
      "-d",
      "postgres",
      "-c",
      `SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = '${name}' AND pid <> pg_backend_pid();`,
    ],
    repoRoot,
  );
  runCommand(
    "dropdb",
    ["--if-exists", "-h", "127.0.0.1", "-p", "5432", "-U", "postgres", name],
    repoRoot,
  );
}

function nextIp(prefix: string): string {
  ipCounter += 1;
  return `203.0.113.${(ipCounter % 200) + 1}`;
}

async function apiRequest<T>(
  method: string,
  path: string,
  {
    body,
    token,
    organizationId,
    forwardedFor,
    origin,
    cookie,
    csrfToken,
  }: {
    body?: unknown;
    token?: string;
    organizationId?: string;
    forwardedFor?: string;
    origin?: string;
    cookie?: string;
    csrfToken?: string;
  } = {},
): Promise<{ status: number; data: T; headers: Headers }> {
  const response = await fetch(`${baseUrl}${path}`, {
    method,
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(organizationId ? { "x-organization-id": organizationId } : {}),
      ...(forwardedFor ? { "x-forwarded-for": forwardedFor } : {}),
      ...(origin ? { Origin: origin } : {}),
      ...(cookie ? { Cookie: cookie } : {}),
      ...(csrfToken ? { "X-CSRF-Token": csrfToken } : {}),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });

  const text = await response.text();
  return {
    status: response.status,
    data: (text ? JSON.parse(text) : undefined) as T,
    headers: response.headers,
  };
}

async function issueCsrf(cookie?: string): Promise<{ csrfToken: string; csrfCookie: string }> {
  const response = await apiRequest<{
    csrfToken: string;
    headerName: string;
    cookieName: string;
  }>("GET", "/auth/csrf", {
    cookie,
  });

  assert.equal(response.status, 200);
  return {
    csrfToken: response.data.csrfToken,
    csrfCookie: extractCookiePair(getCookieHeader(response.headers)),
  };
}

async function loginAdmin(): Promise<void> {
  const sdk = createProjectKitSdk({
    baseUrl,
    getAccessToken: () => undefined,
    getOrganizationId: () => undefined,
  });
  const response = await sdk.auth.login({
    email: "admin@example.com",
    password: "AdminPassword123!",
  });

  adminToken = response.accessToken;
  adminOrganizationId = response.user.organizations[0]?.id ?? "";
  assert.ok(adminOrganizationId);
}

before(async () => {
  dropDatabase(databaseName);
  runCommand("createdb", ["-h", "127.0.0.1", "-p", "5432", "-U", "postgres", databaseName], repoRoot);
  runCommand("pnpm", ["exec", "prisma", "migrate", "deploy"]);

  process.env.DATABASE_URL = databaseUrl;
  process.env.APP_ENV = "development";
  process.env.ALLOWED_ORIGINS = allowedOrigin;
  process.env.CONFIG_ENCRYPTION_KEY = configEncryptionKey;
  process.env.JWT_SECRET = "test-secret";
  process.env.JWT_ACCESS_EXPIRES_IN = "15m";
  process.env.AUTH_PASSWORD_RESET_TOKEN_TTL_MINUTES = "30";
  process.env.AUTH_PASSWORD_RESET_URL = "http://localhost:3001/reset-password";
  process.env.CASBIN_MODEL_PATH = resolve(apiDir, "src/infrastructure/casbin/model.conf");
  process.env.TRUST_PROXY = "1";
  process.env.MULTI_INSTANCE = "false";
  process.env.REDIS_ENABLED = "false";

  const moduleRef = await Test.createTestingModule({
    imports: [AppModule],
  }).compile();

  app = moduleRef.createNestApplication();
  configureApp(app);
  await app.listen(0, "127.0.0.1");

  const address = app.getHttpServer().address();
  assert.ok(address && typeof address === "object" && "port" in address);
  baseUrl = `http://127.0.0.1:${address.port}/api`;
  prisma = app.get(PrismaService);
  jwtService = app.get(JwtService);
});

after(async () => {
  await app?.close();
  await prisma?.$disconnect();
  dropDatabase(databaseName);
});

test("installer status is minimal before and after setup", async () => {
  const beforeStatus = await apiRequest<{ installed: boolean }>("GET", "/installer/status");
  assert.equal(beforeStatus.status, 200);
  assert.deepEqual(beforeStatus.data, { installed: false });

  const setupResponse = await apiRequest("POST", "/installer/setup", {
    body: {
      appName: "Project Kit",
      organizationName: "Default Organization",
      organizationSlug: "default",
      adminEmail: "admin@example.com",
      adminPassword: "AdminPassword123!",
      adminName: "Admin",
    },
    forwardedFor: nextIp("setup"),
  });
  assert.equal(setupResponse.status, 201);

  const afterStatus = await apiRequest<{ installed: boolean }>("GET", "/installer/status");
  assert.equal(afterStatus.status, 200);
  assert.deepEqual(afterStatus.data, { installed: true });

  await loginAdmin();
});

test("allowed origins receive CORS headers, disallowed origins do not, and helmet adds security headers", async () => {
  const allowedResponse = await apiRequest<{ installed: boolean }>("GET", "/installer/status", {
    origin: allowedOrigin,
  });
  assert.equal(allowedResponse.status, 200);
  assert.equal(allowedResponse.headers.get("access-control-allow-origin"), allowedOrigin);
  assert.equal(allowedResponse.headers.get("access-control-allow-credentials"), "true");
  assert.equal(allowedResponse.headers.get("x-content-type-options"), "nosniff");

  const deniedResponse = await apiRequest<{ installed: boolean }>("GET", "/installer/status", {
    origin: "https://evil.example",
  });
  assert.equal(deniedResponse.status, 200);
  assert.equal(deniedResponse.headers.get("access-control-allow-origin"), null);
});

test("login issues jti-bearing JWT and sets an httpOnly auth cookie", async () => {
  const response = await apiRequest<{
    accessToken: string;
    user: { organizations: Array<{ id: string }> };
  }>("POST", "/auth/login", {
    body: {
      email: "admin@example.com",
      password: "AdminPassword123!",
    },
  });

  assert.equal(response.status, 201);
  const payload = decodeJwtPayload(response.data.accessToken);
  assert.equal(typeof payload.jti, "string");

  const setCookie = getSetCookie(response.headers);
  assert.match(setCookie, /HttpOnly/);
  assert.match(setCookie, /SameSite=Strict/);
  assert.doesNotMatch(setCookie, /Secure/);
});

test("cookie auth works, bearer fallback remains available, and removed debug endpoints return 404", async () => {
  const loginResponse = await apiRequest<{ accessToken: string }>("POST", "/auth/login", {
    body: {
      email: "admin@example.com",
      password: "AdminPassword123!",
    },
  });
  const authCookie = extractCookiePair(getSetCookie(loginResponse.headers));

  const meViaCookie = await apiRequest<{ id: string }>("GET", "/auth/me", {
    cookie: authCookie,
  });
  assert.equal(meViaCookie.status, 200);

  const meViaBearer = await apiRequest<{ id: string }>("GET", "/auth/me", {
    token: loginResponse.data.accessToken,
  });
  assert.equal(meViaBearer.status, 200);

  const contextResponse = await apiRequest("GET", "/auth/context", {
    token: loginResponse.data.accessToken,
  });
  assert.equal(contextResponse.status, 404);

  const permissionsCheckResponse = await apiRequest("GET", "/auth/permissions-check", {
    token: loginResponse.data.accessToken,
  });
  assert.equal(permissionsCheckResponse.status, 404);
});

test("cookie-auth mutating requests require CSRF while GET stays exempt", async () => {
  const loginResponse = await apiRequest<{ accessToken: string; user: { organizations: Array<{ id: string }> } }>(
    "POST",
    "/auth/login",
    {
      body: {
        email: "admin@example.com",
        password: "AdminPassword123!",
      },
    },
  );
  const authCookie = extractCookiePair(getSetCookie(loginResponse.headers));
  const organizationId = loginResponse.data.user.organizations[0]?.id ?? "";
  assert.ok(organizationId);

  const meViaCookie = await apiRequest<{ id: string }>("GET", "/auth/me", {
    cookie: authCookie,
  });
  assert.equal(meViaCookie.status, 200);

  const missingCsrf = await apiRequest<{ message: string }>(
    "PATCH",
    "/notification-connectors/smtp_email",
    {
      cookie: authCookie,
      organizationId,
      body: {
        status: "ENABLED",
        config: {
          host: "smtp.example.com",
          port: 587,
          secure: false,
          username: "smtp-user",
          password: "SuperSecret123!",
          from: "no-reply@example.com",
        },
      },
    },
  );
  assert.equal(missingCsrf.status, 403);

  const { csrfToken, csrfCookie } = await issueCsrf(authCookie);
  const withCsrf = await apiRequest<{ config: { password: string } }>(
    "PATCH",
    "/notification-connectors/smtp_email",
    {
      cookie: mergeCookies(authCookie, csrfCookie),
      csrfToken,
      organizationId,
      body: {
        status: "ENABLED",
        config: {
          host: "smtp.example.com",
          port: 587,
          secure: false,
          username: "smtp-user",
          password: "SuperSecret123!",
          from: "no-reply@example.com",
        },
      },
    },
  );
  assert.equal(withCsrf.status, 200);
});

test("logout revokes the current token, clears auth/csrf cookies, and protected endpoints reject the old token", async () => {
  const loginResponse = await apiRequest<{ accessToken: string }>("POST", "/auth/login", {
    body: {
      email: "admin@example.com",
      password: "AdminPassword123!",
    },
  });
  const authCookie = extractCookiePair(getSetCookie(loginResponse.headers));

  const missingCsrfLogout = await apiRequest<{ message: string }>("POST", "/auth/logout", {
    cookie: authCookie,
  });
  assert.equal(missingCsrfLogout.status, 403);

  const { csrfToken, csrfCookie } = await issueCsrf(authCookie);

  const logoutResponse = await apiRequest<{ success: true }>("POST", "/auth/logout", {
    cookie: mergeCookies(authCookie, csrfCookie),
    csrfToken,
  });
  assert.equal(logoutResponse.status, 200);
  assert.deepEqual(logoutResponse.data, { success: true });

  const clearedCookie = getSetCookie(logoutResponse.headers);
  assert.match(clearedCookie, /Max-Age=0/);
  assert.match(clearedCookie, /HttpOnly/);
  assert.match(clearedCookie, /XSRF-TOKEN=/);

  const meAfterLogout = await apiRequest<{ message: string }>("GET", "/auth/me", {
    token: loginResponse.data.accessToken,
  });
  assert.equal(meAfterLogout.status, 401);
});

test("bearer requests remain exempt from CSRF when AUTH_BEARER_ENABLED=true", async () => {
  const response = await apiRequest<{ config: { password: string } }>(
    "PATCH",
    "/notification-connectors/smtp_email",
    {
      token: adminToken,
      organizationId: adminOrganizationId,
      body: {
        status: "ENABLED",
        config: {
          host: "smtp-bearer.example.com",
          port: 587,
          secure: false,
          username: "smtp-user",
          password: "SuperSecret123!",
          from: "no-reply@example.com",
        },
      },
    },
  );

  assert.equal(response.status, 200);
});

test("bearer requests are rejected when AUTH_BEARER_ENABLED=false", async () => {
  const originalBearerEnabled = process.env.AUTH_BEARER_ENABLED;
  let isolatedApp: INestApplication | undefined;

  try {
    process.env.AUTH_BEARER_ENABLED = "false";
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    isolatedApp = moduleRef.createNestApplication();
    configureApp(isolatedApp);
    await isolatedApp.listen(0, "127.0.0.1");
    const address = isolatedApp.getHttpServer().address();
    assert.ok(address && typeof address === "object" && "port" in address);
    const isolatedBaseUrl = `http://127.0.0.1:${address.port}/api`;

    const response = await fetch(`${isolatedBaseUrl}/auth/me`, {
      headers: {
        Accept: "application/json",
        Authorization: `Bearer ${adminToken}`,
      },
    });

    assert.equal(response.status, 401);
  } finally {
    if (originalBearerEnabled === undefined) {
      delete process.env.AUTH_BEARER_ENABLED;
    } else {
      process.env.AUTH_BEARER_ENABLED = originalBearerEnabled;
    }
    await isolatedApp?.close();
  }
});

test("blocked users fail JWT strategy validation even with a signed token", async () => {
  const blockedUser = await prisma.user.create({
    data: {
      email: `blocked-${Date.now()}@example.com`,
      passwordHash: "unused",
      status: UserStatus.BLOCKED,
    },
  });

  const blockedToken = await jwtService.signAsync({
    sub: blockedUser.id,
    jti: `blocked-${blockedUser.id}`,
    email: blockedUser.email,
    systemRoles: [],
    organizations: [],
  });

  const response = await apiRequest<{ message: string }>("GET", "/auth/me", {
    token: blockedToken,
  });
  assert.equal(response.status, 401);
});

test("SMTP connector passwords are encrypted at rest, masked in API responses, and preserved on masked updates", async () => {
  const updateResponse = await apiRequest<{
    config: { password: string };
  }>("PATCH", "/notification-connectors/smtp_email", {
    token: adminToken,
    organizationId: adminOrganizationId,
    body: {
      status: "ENABLED",
      config: {
        host: "smtp.example.com",
        port: 587,
        secure: false,
        username: "smtp-user",
        password: "SuperSecret123!",
        from: "no-reply@example.com",
      },
    },
  });
  assert.equal(updateResponse.status, 200);
  assert.equal(updateResponse.data.config.password, "********");

  const storedConnector = await prisma.notificationConnector.findUniqueOrThrow({
    where: { code: "smtp_email" },
  });
  const storedConfig = storedConnector.config as Record<string, unknown>;
  assert.notEqual(storedConfig.password, "SuperSecret123!");
  assert.match(String(storedConfig.password), /^enc:v1:/);

  const maskedUpdate = await apiRequest<{
    config: { password: string; host: string };
  }>("PATCH", "/notification-connectors/smtp_email", {
    token: adminToken,
    organizationId: adminOrganizationId,
    body: {
      config: {
        host: "smtp2.example.com",
        password: "********",
      },
    },
  });
  assert.equal(maskedUpdate.status, 200);
  assert.equal(maskedUpdate.data.config.password, "********");
  assert.equal(maskedUpdate.data.config.host, "smtp2.example.com");

  const updatedConnector = await prisma.notificationConnector.findUniqueOrThrow({
    where: { code: "smtp_email" },
  });
  const updatedConfig = updatedConnector.config as Record<string, unknown>;
  assert.equal(updatedConfig.password, storedConfig.password);
});

test("installer setup rejects repeat calls and concurrent retries without creating duplicates", async () => {
  const repeated = await apiRequest<{ message: string }>("POST", "/installer/setup", {
    body: {
      appName: "Project Kit",
      organizationName: "Default Organization",
      organizationSlug: "default",
      adminEmail: "admin@example.com",
      adminPassword: "AdminPassword123!",
      adminName: "Admin",
    },
    forwardedFor: nextIp("setup-repeat"),
  });
  assert.equal(repeated.status, 409);

  assert.equal(await prisma.installation.count({ where: { installed: true } }), 1);
  assert.equal(await prisma.user.count({ where: { email: "admin@example.com" } }), 1);
  assert.equal(await prisma.organization.count({ where: { slug: "default" } }), 1);

  const dbName = `project_kit_security_race_${Date.now()}_${Math.random().toString(16).slice(2, 8)}`;
  const dbUrl = `postgresql://postgres:postgres@127.0.0.1:5432/${dbName}?schema=public`;
  let isolatedApp: INestApplication | undefined;
  let isolatedPrisma: InstanceType<typeof PrismaService> | undefined;

  runCommand("createdb", ["-h", "127.0.0.1", "-p", "5432", "-U", "postgres", dbName], repoRoot);
  runCommand("pnpm", ["exec", "prisma", "migrate", "deploy"], apiDir, {
    DATABASE_URL: dbUrl,
  });

  try {
    process.env.DATABASE_URL = dbUrl;
    process.env.TRUST_PROXY = "1";
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    isolatedApp = moduleRef.createNestApplication();
    configureApp(isolatedApp);
    await isolatedApp.listen(0, "127.0.0.1");
    const address = isolatedApp.getHttpServer().address();
    assert.ok(address && typeof address === "object" && "port" in address);
    const isolatedBaseUrl = `http://127.0.0.1:${address.port}/api`;
    isolatedPrisma = isolatedApp.get(PrismaService);

    const payload = {
      appName: "Project Kit",
      organizationName: "Default Organization",
      organizationSlug: "default",
      adminEmail: "admin@example.com",
      adminPassword: "AdminPassword123!",
      adminName: "Admin",
    };
    const [first, second] = await Promise.all([
      fetch(`${isolatedBaseUrl}/installer/setup`, {
        method: "POST",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
          "x-forwarded-for": "198.51.100.21",
        },
        body: JSON.stringify(payload),
      }),
      fetch(`${isolatedBaseUrl}/installer/setup`, {
        method: "POST",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
          "x-forwarded-for": "198.51.100.22",
        },
        body: JSON.stringify(payload),
      }),
    ]);

    assert.deepEqual(
      [first.status, second.status].sort((left, right) => left - right),
      [201, 409],
    );
    assert.equal(await isolatedPrisma.installation.count({ where: { installed: true } }), 1);
    assert.equal(
      await isolatedPrisma.user.count({ where: { email: "admin@example.com" } }),
      1,
    );
    assert.equal(
      await isolatedPrisma.organization.count({ where: { slug: "default" } }),
      1,
    );
  } finally {
    await isolatedApp?.close();
    await isolatedPrisma?.$disconnect();
    process.env.DATABASE_URL = databaseUrl;
    dropDatabase(dbName);
  }
});

test("installer setup is rate-limited by IP before installation completes", async () => {
  const dbName = `project_kit_security_rate_${Date.now()}_${Math.random().toString(16).slice(2, 8)}`;
  const dbUrl = `postgresql://postgres:postgres@127.0.0.1:5432/${dbName}?schema=public`;
  let isolatedApp: INestApplication | undefined;
  let isolatedPrisma: InstanceType<typeof PrismaService> | undefined;
  let isolatedBaseUrl = "";

  runCommand("createdb", ["-h", "127.0.0.1", "-p", "5432", "-U", "postgres", dbName], repoRoot);
  runCommand("pnpm", ["exec", "prisma", "migrate", "deploy"], apiDir, {
    DATABASE_URL: dbUrl,
  });

  try {
    process.env.DATABASE_URL = dbUrl;
    process.env.TRUST_PROXY = "1";

    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    isolatedApp = moduleRef.createNestApplication();
    configureApp(isolatedApp);
    await isolatedApp.listen(0, "127.0.0.1");
    const address = isolatedApp.getHttpServer().address();
    assert.ok(address && typeof address === "object" && "port" in address);
    isolatedBaseUrl = `http://127.0.0.1:${address.port}/api`;
    isolatedPrisma = isolatedApp.get(PrismaService);

    const rateLimitIp = "198.51.100.10";
    for (let index = 0; index < 3; index += 1) {
      const response = await fetch(`${isolatedBaseUrl}/installer/setup`, {
        method: "POST",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
          "x-forwarded-for": rateLimitIp,
        },
        body: JSON.stringify({}),
      });
      assert.equal(response.status, 400);
    }

    const blocked = await fetch(`${isolatedBaseUrl}/installer/setup`, {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        "x-forwarded-for": rateLimitIp,
      },
      body: JSON.stringify({}),
    });
    assert.equal(blocked.status, 429);
    assert.match(await blocked.text(), /Too many requests/);
  } finally {
    await isolatedApp?.close();
    await isolatedPrisma?.$disconnect();
    process.env.DATABASE_URL = databaseUrl;
    dropDatabase(dbName);
  }
});

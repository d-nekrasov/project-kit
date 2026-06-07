import "reflect-metadata";

import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { createRequire } from "node:module";
import { after, before, beforeEach, test } from "node:test";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

import { INestApplication, ValidationPipe } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import {
  NotificationChannel,
  NotificationConnectorStatus,
  UserStatus,
} from "@prisma/client";
import * as argon2 from "argon2";

import { createProjectKitSdk } from "../../../packages/sdk/src/create-project-kit-sdk";
import { ApiError } from "../../../packages/sdk/src/client/api-error";

type SentEmail = {
  to: string;
  subject: string;
  body: string;
  channel: NotificationChannel;
};

class MailSpyConnector {
  readonly sent: SentEmail[] = [];

  async send(input: {
    to?: string;
    subject?: string;
    body?: string;
    channel: NotificationChannel;
  }): Promise<{ ok: boolean }> {
    this.sent.push({
      to: input.to ?? "",
      subject: input.subject ?? "",
      body: input.body ?? "",
      channel: input.channel,
    });
    return { ok: true };
  }
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const require = createRequire(import.meta.url);
const apiDir = resolve(__dirname, "..");
const repoRoot = resolve(apiDir, "..", "..");
const baseResetUrl = "http://admin.local/reset-password";
const databaseName = `project_kit_recovery_${Date.now()}_${Math.random().toString(16).slice(2, 10)}`;
const databaseUrl = `postgresql://postgres:postgres@127.0.0.1:5432/${databaseName}?schema=public`;
const { AppModule } = require("../dist/src/app.module");
const {
  EmailSmtpNotificationConnector,
} = require("../dist/src/core/notifications/connectors/email-smtp-notification.connector");
const { PrismaService } = require("../dist/src/infrastructure/prisma/prisma.service");

let baseUrl = "";
let app: INestApplication;
let prisma: PrismaService;
let adminToken = "";
let adminOrganizationId = "";
let adminSdk: ReturnType<typeof createProjectKitSdk>;
const mailSpy = new MailSpyConnector();
let userCounter = 0;
let ipCounter = 0;

function runCommand(command: string, args: string[], cwd = apiDir): void {
  execFileSync(command, args, {
    cwd,
    stdio: "pipe",
    env: {
      ...process.env,
      DATABASE_URL: databaseUrl,
      PGPASSWORD: "postgres",
    },
  });
}

function hashToken(token: string): string {
  return createHash("sha256").update(token, "utf8").digest("hex");
}

function nextEmail(prefix: string): string {
  userCounter += 1;
  return `${prefix}-${userCounter}@example.com`;
}

function nextIp(prefix: string): string {
  ipCounter += 1;
  return `198.51.100.${(ipCounter % 200) + 1}`;
}

function extractTokenFromEmail(email: SentEmail): string {
  const urlMatch = email.body.match(/https?:\/\/[^\s]+/);
  assert.ok(urlMatch, "Reset email must include a reset link");
  const token = new URL(urlMatch[0]).searchParams.get("token");
  assert.ok(token, "Reset link must include token");
  return token;
}

async function apiRequest<T>(
  method: string,
  path: string,
  {
    body,
    token,
    organizationId,
    forwardedFor,
  }: {
    body?: unknown;
    token?: string;
    organizationId?: string;
    forwardedFor?: string;
  } = {},
): Promise<{ status: number; data: T }> {
  const response = await fetch(`${baseUrl}${path}`, {
    method,
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(organizationId ? { "x-organization-id": organizationId } : {}),
      ...(forwardedFor ? { "x-forwarded-for": forwardedFor } : {}),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });

  const text = await response.text();
  return {
    status: response.status,
    data: (text ? JSON.parse(text) : undefined) as T,
  };
}

async function createUser(options?: {
  status?: UserStatus;
  email?: string;
  password?: string;
}): Promise<{
  id: string;
  email: string;
  password: string;
}> {
  const email = options?.email ?? nextEmail("user");
  const password = options?.password ?? "OldPassword123!";
  const role = await prisma.role.findFirstOrThrow({
    where: {
      organizationId: adminOrganizationId,
      code: "user",
    },
    select: { id: true },
  });
  const passwordHash = await argon2.hash(password);
  const user = await prisma.user.create({
    data: {
      email,
      passwordHash,
      status: options?.status ?? UserStatus.ACTIVE,
      memberships: {
        create: {
          organizationId: adminOrganizationId,
          roleId: role.id,
          status: UserStatus.ACTIVE,
        },
      },
    },
    select: { id: true, email: true },
  });

  return { id: user.id, email: user.email, password };
}

before(async () => {
  runCommand("dropdb", ["--if-exists", "-h", "127.0.0.1", "-p", "5432", "-U", "postgres", databaseName], repoRoot);
  runCommand("createdb", ["-h", "127.0.0.1", "-p", "5432", "-U", "postgres", databaseName], repoRoot);
  runCommand("pnpm", ["exec", "prisma", "migrate", "deploy"]);

  process.env.DATABASE_URL = databaseUrl;
  process.env.JWT_SECRET = "test-secret";
  process.env.JWT_ACCESS_EXPIRES_IN = "15m";
  process.env.AUTH_PASSWORD_RESET_TOKEN_TTL_MINUTES = "30";
  process.env.AUTH_PASSWORD_RESET_URL = baseResetUrl;
  process.env.CASBIN_MODEL_PATH = resolve(apiDir, "src/infrastructure/casbin/model.conf");

  const moduleRef = await Test.createTestingModule({
    imports: [AppModule],
  })
    .overrideProvider(EmailSmtpNotificationConnector)
    .useValue(mailSpy)
    .compile();

  app = moduleRef.createNestApplication();
  app.setGlobalPrefix("api");
  app.enableCors();
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
  await app.listen(0, "127.0.0.1");

  const address = app.getHttpServer().address();
  assert.ok(address && typeof address === "object" && "port" in address);
  baseUrl = `http://127.0.0.1:${address.port}/api`;

  prisma = app.get(PrismaService);
  await prisma.notificationConnector.update({
    where: { code: "smtp_email" },
    data: {
      status: NotificationConnectorStatus.ENABLED,
      config: {
        host: "smtp.example.com",
        port: 587,
        secure: false,
        from: "no-reply@example.com",
      },
    },
  });

  const installerResponse = await apiRequest<{
    installation: { installed: boolean };
    organization: { id: string };
    admin: { id: string; email: string };
  }>("POST", "/installer/setup", {
    body: {
      appName: "Project Kit",
      organizationName: "Default Organization",
      organizationSlug: "default",
      adminEmail: "admin@example.com",
      adminPassword: "AdminPassword123!",
      adminName: "Admin",
    },
  });
  assert.equal(installerResponse.status, 201);

  const adminLoginSdk = createProjectKitSdk({
    baseUrl,
    getAccessToken: () => undefined,
    getOrganizationId: () => undefined,
  });
  const adminLogin = await adminLoginSdk.auth.login({
    email: "admin@example.com",
    password: "AdminPassword123!",
  });

  adminToken = adminLogin.accessToken;
  adminOrganizationId = adminLogin.user.organizations[0]?.id ?? "";
  assert.ok(adminOrganizationId, "Admin organization id is required for tests");

  adminSdk = createProjectKitSdk({
    baseUrl,
    getAccessToken: () => adminToken,
    getOrganizationId: () => adminOrganizationId,
  });
});

after(async () => {
  await app?.close();
  await prisma?.$disconnect();
  runCommand("dropdb", ["--if-exists", "-h", "127.0.0.1", "-p", "5432", "-U", "postgres", databaseName], repoRoot);
});

beforeEach(() => {
  mailSpy.sent.length = 0;
});

test("Prisma migration creates password reset token storage with expected columns", async () => {
  const columns = await prisma.$queryRaw<Array<{ column_name: string }>>`
    SELECT column_name
    FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'PasswordResetToken'
    ORDER BY ordinal_position
  `;

  assert.deepEqual(
    columns.map((column) => column.column_name),
    [
      "id",
      "userId",
      "tokenHash",
      "expiresAt",
      "usedAt",
      "createdAt",
      "requestIp",
      "requestUserAgent",
      "usedIp",
      "usedUserAgent",
    ],
  );
});

test("forgot-password is neutral, stores only token hash, skips unknown and inactive users, and invalidates previous tokens", async () => {
  const activeUser = await createUser();
  const inactiveUser = await createUser({ status: UserStatus.INACTIVE });
  const firstIp = nextIp("forgot");

  const firstResponse = await apiRequest<{ message: string }>("POST", "/auth/forgot-password", {
    body: { email: activeUser.email },
    forwardedFor: firstIp,
  });
  assert.equal(firstResponse.status, 201);
  assert.equal(
    firstResponse.data.message,
    "If an account exists for that email, password reset instructions will be sent.",
  );
  assert.equal(mailSpy.sent.length, 1);

  const firstToken = extractTokenFromEmail(mailSpy.sent[0]);
  const firstTokenRecord = await prisma.passwordResetToken.findUniqueOrThrow({
    where: { tokenHash: hashToken(firstToken) },
  });
  assert.notEqual(firstTokenRecord.tokenHash, firstToken);
  assert.equal(firstTokenRecord.requestIp, firstIp);
  assert.equal(firstTokenRecord.usedAt, null);

  const firstAuditLog = await prisma.auditLog.findFirstOrThrow({
    where: {
      action: "auth.password_reset_requested",
      userId: activeUser.id,
      ip: firstIp,
    },
    orderBy: { createdAt: "desc" },
  });
  assert.doesNotMatch(JSON.stringify(firstAuditLog.metadata), new RegExp(firstToken, "g"));

  const secondIp = nextIp("forgot");
  const secondResponse = await apiRequest<{ message: string }>("POST", "/auth/forgot-password", {
    body: { email: activeUser.email },
    forwardedFor: secondIp,
  });
  assert.equal(secondResponse.status, 201);
  assert.equal(mailSpy.sent.length, 2);

  const secondToken = extractTokenFromEmail(mailSpy.sent[1]);
  const refreshedFirstToken = await prisma.passwordResetToken.findUniqueOrThrow({
    where: { id: firstTokenRecord.id },
  });
  assert.ok(refreshedFirstToken.usedAt, "Previous active token must be invalidated");

  const firstTokenValidation = await apiRequest<{ valid: boolean; reason?: string }>(
    "POST",
    "/auth/reset-password/validate",
    { body: { token: firstToken } },
  );
  assert.equal(firstTokenValidation.status, 201);
  assert.deepEqual(firstTokenValidation.data, { valid: false, reason: "used" });

  const unknownResponse = await apiRequest<{ message: string }>("POST", "/auth/forgot-password", {
    body: { email: nextEmail("missing") },
    forwardedFor: nextIp("forgot"),
  });
  assert.equal(unknownResponse.status, 201);
  assert.equal(mailSpy.sent.length, 2);
  assert.equal(
    await prisma.passwordResetToken.count({
      where: { userId: activeUser.id },
    }),
    2,
  );

  const inactiveResponse = await apiRequest<{ message: string }>("POST", "/auth/forgot-password", {
    body: { email: inactiveUser.email },
    forwardedFor: nextIp("forgot"),
  });
  assert.equal(inactiveResponse.status, 201);
  assert.equal(mailSpy.sent.length, 2);

  const tokensForInactiveUser = await prisma.passwordResetToken.count({
    where: { userId: inactiveUser.id },
  });
  assert.equal(tokensForInactiveUser, 0);

  const activeTokenValidation = await apiRequest<{ valid: boolean; expiresAt?: string }>(
    "POST",
    "/auth/reset-password/validate",
    { body: { token: secondToken } },
  );
  assert.equal(activeTokenValidation.status, 201);
  assert.equal(activeTokenValidation.data.valid, true);
  assert.ok(activeTokenValidation.data.expiresAt);
});

test("reset-password updates password, consumes token once, invalidates other active tokens, and records audit logs without inbox notifications", async () => {
  const user = await createUser({ password: "OriginalPassword123!" });

  const forgotResponse = await apiRequest<{ message: string }>("POST", "/auth/forgot-password", {
    body: { email: user.email },
    forwardedFor: nextIp("forgot"),
  });
  assert.equal(forgotResponse.status, 201);
  const primaryToken = extractTokenFromEmail(mailSpy.sent[0]);
  const primaryRecord = await prisma.passwordResetToken.findUniqueOrThrow({
    where: { tokenHash: hashToken(primaryToken) },
  });

  const manualSiblingToken = "manual-secondary-token";
  const siblingRecord = await prisma.passwordResetToken.create({
    data: {
      userId: user.id,
      tokenHash: hashToken(manualSiblingToken),
      expiresAt: new Date(Date.now() + 10 * 60 * 1000),
    },
  });

  const notificationCountBeforeReset = await prisma.notification.count();
  const resetIp = nextIp("reset");
  const resetResponse = await apiRequest<{ message: string }>("POST", "/auth/reset-password", {
    body: {
      token: primaryToken,
      password: "NewPassword123!",
      passwordConfirmation: "NewPassword123!",
    },
    forwardedFor: resetIp,
  });

  assert.equal(resetResponse.status, 201);
  assert.equal(resetResponse.data.message, "Password has been reset successfully.");

  const consumedPrimaryRecord = await prisma.passwordResetToken.findUniqueOrThrow({
    where: { id: primaryRecord.id },
  });
  const consumedSiblingRecord = await prisma.passwordResetToken.findUniqueOrThrow({
    where: { id: siblingRecord.id },
  });
  assert.ok(consumedPrimaryRecord.usedAt);
  assert.equal(consumedPrimaryRecord.usedIp, resetIp);
  assert.ok(consumedSiblingRecord.usedAt, "Other active tokens must be invalidated");

  const notificationCountAfterReset = await prisma.notification.count();
  assert.equal(notificationCountAfterReset, notificationCountBeforeReset);

  const resetCompletedLog = await prisma.auditLog.findFirstOrThrow({
    where: {
      action: "auth.password_reset_completed",
      userId: user.id,
      ip: resetIp,
    },
    orderBy: { createdAt: "desc" },
  });
  assert.doesNotMatch(JSON.stringify(resetCompletedLog.metadata), new RegExp(primaryToken, "g"));

  const publicSdk = createProjectKitSdk({
    baseUrl,
    getAccessToken: () => undefined,
    getOrganizationId: () => undefined,
  });

  await assert.rejects(
    () =>
      publicSdk.auth.login({
        email: user.email,
        password: "OriginalPassword123!",
      }),
    (error: unknown) =>
      error instanceof ApiError &&
      error.status === 401 &&
      error.message === "Invalid email or password",
  );

  const newLogin = await publicSdk.auth.login({
    email: user.email,
    password: "NewPassword123!",
  });
  assert.ok(newLogin.accessToken);

  const usedTokenResponse = await apiRequest<{ message: string }>("POST", "/auth/reset-password", {
    body: {
      token: primaryToken,
      password: "AnotherPassword123!",
      passwordConfirmation: "AnotherPassword123!",
    },
    forwardedFor: nextIp("reset"),
  });
  assert.equal(usedTokenResponse.status, 400);
  assert.equal(usedTokenResponse.data.message, "Password reset token is invalid or expired");
});

test("reset-password rejects invalid, expired, and already used tokens and validate endpoint is non-mutating", async () => {
  const invalidValidation = await apiRequest<{ valid: boolean; reason?: string }>(
    "POST",
    "/auth/reset-password/validate",
    { body: { token: "definitely-invalid-token" } },
  );
  assert.equal(invalidValidation.status, 201);
  assert.deepEqual(invalidValidation.data, { valid: false, reason: "invalid" });

  const invalidIp = nextIp("reset");
  const invalidResponse = await apiRequest<{ message: string }>("POST", "/auth/reset-password", {
    body: {
      token: "definitely-invalid-token",
      password: "Password123!",
      passwordConfirmation: "Password123!",
    },
    forwardedFor: invalidIp,
  });
  assert.equal(invalidResponse.status, 400);
  assert.equal(invalidResponse.data.message, "Password reset token is invalid or expired");

  const invalidFailureLog = await prisma.auditLog.findFirstOrThrow({
    where: {
      action: "auth.password_reset_failed",
      ip: invalidIp,
    },
    orderBy: { createdAt: "desc" },
  });
  assert.match(JSON.stringify(invalidFailureLog.metadata), /token_not_found/);

  const user = await createUser();
  await apiRequest("POST", "/auth/forgot-password", {
    body: { email: user.email },
    forwardedFor: nextIp("forgot"),
  });
  const token = extractTokenFromEmail(mailSpy.sent[0]);
  const tokenHash = hashToken(token);
  const originalRecord = await prisma.passwordResetToken.findUniqueOrThrow({
    where: { tokenHash },
    select: {
      id: true,
      expiresAt: true,
      usedAt: true,
      requestIp: true,
      usedIp: true,
    },
  });

  const validCheck = await apiRequest<{ valid: boolean; expiresAt?: string }>(
    "POST",
    "/auth/reset-password/validate",
    { body: { token } },
  );
  assert.equal(validCheck.status, 201);
  assert.equal(validCheck.data.valid, true);

  const recordAfterValidate = await prisma.passwordResetToken.findUniqueOrThrow({
    where: { tokenHash },
    select: {
      id: true,
      expiresAt: true,
      usedAt: true,
      requestIp: true,
      usedIp: true,
    },
  });
  assert.deepEqual(recordAfterValidate, originalRecord);

  await prisma.passwordResetToken.update({
    where: { tokenHash },
    data: {
      expiresAt: new Date(Date.now() - 60_000),
    },
  });

  const expiredValidation = await apiRequest<{ valid: boolean; reason?: string }>(
    "POST",
    "/auth/reset-password/validate",
    { body: { token } },
  );
  assert.equal(expiredValidation.status, 201);
  assert.deepEqual(expiredValidation.data, { valid: false, reason: "expired" });

  const expiredReset = await apiRequest<{ message: string }>("POST", "/auth/reset-password", {
    body: {
      token,
      password: "Password123!",
      passwordConfirmation: "Password123!",
    },
    forwardedFor: nextIp("reset"),
  });
  assert.equal(expiredReset.status, 400);
  assert.equal(expiredReset.data.message, "Password reset token is invalid or expired");

  const secondUser = await createUser();
  await apiRequest("POST", "/auth/forgot-password", {
    body: { email: secondUser.email },
    forwardedFor: nextIp("forgot"),
  });
  const usedToken = extractTokenFromEmail(mailSpy.sent[1]);
  const usedTokenHash = hashToken(usedToken);
  await prisma.passwordResetToken.update({
    where: { tokenHash: usedTokenHash },
    data: { usedAt: new Date() },
  });

  const usedValidation = await apiRequest<{ valid: boolean; reason?: string }>(
    "POST",
    "/auth/reset-password/validate",
    { body: { token: usedToken } },
  );
  assert.equal(usedValidation.status, 201);
  assert.deepEqual(usedValidation.data, { valid: false, reason: "used" });

  const thirdUser = await createUser();
  await apiRequest("POST", "/auth/forgot-password", {
    body: { email: thirdUser.email },
    forwardedFor: nextIp("forgot"),
  });
  const inactiveToken = extractTokenFromEmail(mailSpy.sent[2]);
  await prisma.user.update({
    where: { id: thirdUser.id },
    data: { status: UserStatus.INACTIVE },
  });

  const inactiveValidation = await apiRequest<{ valid: boolean; reason?: string }>(
    "POST",
    "/auth/reset-password/validate",
    { body: { token: inactiveToken } },
  );
  assert.equal(inactiveValidation.status, 201);
  assert.deepEqual(inactiveValidation.data, { valid: false, reason: "user_inactive" });
});

test("password reset email uses notification template email fields, carries reset link and TTL, and never creates inbox notifications", async () => {
  const updatedTemplate = await adminSdk.notificationTemplates.upsert(
    "auth.password_reset_requested",
    {
      title: "Password reset requested",
      message: "Password reset requested for {{email}}.",
      emailSubject: "Reset {{email}}",
      emailBody: "Link={{resetLink}}\nTTL={{expiresInMinutes}}",
      channels: [NotificationChannel.EMAIL],
    },
  );

  assert.deepEqual(updatedTemplate.channels, [NotificationChannel.EMAIL]);

  const user = await createUser();
  const notificationCountBefore = await prisma.notification.count();
  const response = await apiRequest<{ message: string }>("POST", "/auth/forgot-password", {
    body: { email: user.email },
    forwardedFor: nextIp("forgot"),
  });
  assert.equal(response.status, 201);
  assert.equal(mailSpy.sent.length, 1);
  assert.equal(await prisma.notification.count(), notificationCountBefore);

  const sentEmail = mailSpy.sent[0];
  assert.equal(sentEmail.channel, NotificationChannel.EMAIL);
  assert.equal(sentEmail.subject, `Reset ${user.email}`);
  assert.match(sentEmail.body, /^Link=http:\/\/admin\.local\/reset-password\?token=/m);
  assert.match(sentEmail.body, /TTL=30/);
});

test("password reset notification template is EMAIL-only and rejects IN_APP channel updates", async () => {
  await assert.rejects(
    () =>
      adminSdk.notificationTemplates.upsert("auth.password_reset_requested", {
        title: "Password reset requested",
        message: "Password reset requested for {{email}}.",
        emailSubject: "Reset your password",
        emailBody: "Use {{resetLink}}",
        channels: [NotificationChannel.EMAIL, NotificationChannel.IN_APP],
      }),
    (error: unknown) =>
      error instanceof ApiError &&
      error.status === 400 &&
      error.message.includes('supports only these channels: EMAIL'),
  );

  const template = await prisma.notificationTemplate.findUniqueOrThrow({
    where: { event: "auth.password_reset_requested" },
  });
  assert.deepEqual(template.channels, [NotificationChannel.EMAIL]);
});

test("forgot-password and reset-password are rate-limited at route level", async () => {
  const forgotIp = nextIp("limit");

  for (let index = 0; index < 5; index += 1) {
    const response = await apiRequest<{ message: string }>("POST", "/auth/forgot-password", {
      body: { email: nextEmail("missing-rate-limit") },
      forwardedFor: forgotIp,
    });
    assert.equal(response.status, 201);
  }

  const blockedForgot = await apiRequest<{ message: string }>("POST", "/auth/forgot-password", {
    body: { email: nextEmail("missing-rate-limit") },
    forwardedFor: forgotIp,
  });
  assert.equal(blockedForgot.status, 429);
  assert.equal(blockedForgot.data.message, "Too many requests. Please try again later.");

  const resetIp = nextIp("limit");
  for (let index = 0; index < 10; index += 1) {
    const response = await apiRequest<{ message: string }>("POST", "/auth/reset-password", {
      body: {
        token: "invalid-rate-limit-token",
        password: "Password123!",
        passwordConfirmation: "Password123!",
      },
      forwardedFor: resetIp,
    });
    assert.equal(response.status, 400);
  }

  const blockedReset = await apiRequest<{ message: string }>("POST", "/auth/reset-password", {
    body: {
      token: "invalid-rate-limit-token",
      password: "Password123!",
      passwordConfirmation: "Password123!",
    },
    forwardedFor: resetIp,
  });
  assert.equal(blockedReset.status, 429);
  assert.equal(blockedReset.data.message, "Too many requests. Please try again later.");
});

test("SDK auth recovery methods match backend contract end-to-end", async () => {
  const publicSdk = createProjectKitSdk({
    baseUrl,
    getAccessToken: () => undefined,
    getOrganizationId: () => undefined,
  });
  const user = await createUser({ password: "SdkPassword123!" });

  const forgotResponse = await publicSdk.auth.forgotPassword({ email: user.email });
  assert.equal(
    forgotResponse.message,
    "If an account exists for that email, password reset instructions will be sent.",
  );

  const token = extractTokenFromEmail(mailSpy.sent[0]);
  const validationResponse = await publicSdk.auth.validateResetPasswordToken({ token });
  assert.equal(validationResponse.valid, true);
  assert.ok(validationResponse.expiresAt);

  const resetResponse = await publicSdk.auth.resetPassword({
    token,
    password: "SdkNewPassword123!",
    passwordConfirmation: "SdkNewPassword123!",
  });
  assert.equal(resetResponse.message, "Password has been reset successfully.");

  const loginResponse = await publicSdk.auth.login({
    email: user.email,
    password: "SdkNewPassword123!",
  });
  assert.ok(loginResponse.accessToken);
});

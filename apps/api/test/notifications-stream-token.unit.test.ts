import assert from "node:assert/strict";
import { test } from "node:test";

import { UnauthorizedException } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";

import { NotificationsService } from "../src/core/notifications/notifications.service";

class FakeTokenBlacklistService {
  readonly revokedJtis = new Set<string>();

  async isRevoked(jti: string): Promise<boolean> {
    return this.revokedJtis.has(jti);
  }
}

function createService(options?: {
  tokenBlacklist?: FakeTokenBlacklistService;
  userStatus?: string | null;
}) {
  const jwtService = new JwtService({ secret: "stream-token-test-secret" });
  const prisma = {
    user: {
      findUnique: async () =>
        options?.userStatus === null
          ? null
          : { id: "user-1", status: options?.userStatus ?? "ACTIVE" },
    },
  };
  const service = new NotificationsService(
    prisma as never,
    {} as never,
    {} as never,
    {} as never,
    jwtService,
    {} as never,
    (options?.tokenBlacklist ?? new FakeTokenBlacklistService()) as never,
  );

  return { service, jwtService };
}

const currentUser = {
  id: "user-1",
  email: "user@example.com",
  name: "User",
  systemRoles: [],
  organizations: [],
};

test("createStreamToken embeds the parent session jti", async () => {
  const { service, jwtService } = createService();

  const { token } = await service.createStreamToken(currentUser, "session-jti");
  const payload = await jwtService.verifyAsync<{
    sub: string;
    purpose: string;
    parentJti: string;
  }>(token);

  assert.equal(payload.sub, "user-1");
  assert.equal(payload.purpose, "notification_stream");
  assert.equal(payload.parentJti, "session-jti");
});

test("createStreamToken rejects requests without a session jti", async () => {
  const { service } = createService();

  await assert.rejects(
    service.createStreamToken(currentUser, undefined),
    UnauthorizedException,
  );
});

test("validateStreamToken accepts a token bound to an active session", async () => {
  const { service } = createService();

  const { token } = await service.createStreamToken(currentUser, "session-jti");
  const result = await service.validateStreamToken(token);

  assert.deepEqual(result, { userId: "user-1", parentJti: "session-jti" });
});

test("validateStreamToken rejects a token whose parent session was revoked", async () => {
  const tokenBlacklist = new FakeTokenBlacklistService();
  const { service } = createService({ tokenBlacklist });

  const { token } = await service.createStreamToken(currentUser, "session-jti");
  tokenBlacklist.revokedJtis.add("session-jti");

  await assert.rejects(
    service.validateStreamToken(token),
    UnauthorizedException,
  );
});

test("validateStreamToken rejects tokens without parentJti", async () => {
  const { service, jwtService } = createService();
  const token = await jwtService.signAsync(
    { sub: "user-1", purpose: "notification_stream" },
    { expiresIn: 60 },
  );

  await assert.rejects(
    service.validateStreamToken(token),
    UnauthorizedException,
  );
});

import assert from "node:assert/strict";
import { test } from "node:test";

import { UnauthorizedException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";

import { JwtStrategy } from "../src/core/auth/strategies/jwt.strategy";
import { CurrentUser } from "../src/core/auth/types/current-user.type";

function createStrategy(options?: { revoked?: boolean }) {
  const currentUser: CurrentUser = {
    id: "user-1",
    email: "user@example.com",
    name: "User",
    systemRoles: [],
    organizations: [],
  };
  const blacklistCalls: string[] = [];
  const strategy = new JwtStrategy(
    {
      async getCurrentUserById(): Promise<CurrentUser> {
        return currentUser;
      },
    } as never,
    {
      extractAccessToken(headers: { authorization?: string }): string | null {
        const authorization = headers.authorization;
        return authorization?.startsWith("Bearer ")
          ? authorization.slice("Bearer ".length)
          : null;
      },
    } as never,
    {
      async isRevoked(jti: string): Promise<boolean> {
        blacklistCalls.push(jti);
        return options?.revoked ?? false;
      },
    } as never,
    new ConfigService({ JWT_SECRET: "test-secret-test-secret-test-secret-0000" }),
  );

  return { strategy, blacklistCalls, currentUser };
}

test("JwtStrategy rejects tokens with blacklisted jti", async () => {
  const { strategy } = createStrategy({ revoked: true });

  await assert.rejects(
    strategy.validate({ headers: {} }, { sub: "user-1", jti: "revoked-jti", email: "", systemRoles: [], organizations: [] }),
    UnauthorizedException,
  );
});

test("JwtStrategy rejects tokens without jti", async () => {
  const { strategy } = createStrategy();

  await assert.rejects(
    strategy.validate({ headers: {} }, { sub: "user-1", email: "", systemRoles: [], organizations: [] }),
    UnauthorizedException,
  );
});

test("JwtStrategy accepts tokens with non-blacklisted jti", async () => {
  const { strategy, blacklistCalls, currentUser } = createStrategy();

  const validatedUser = await strategy.validate(
    { headers: {} },
    { sub: "user-1", jti: "active-jti", email: "", systemRoles: [], organizations: [] },
  );

  assert.deepEqual(validatedUser, currentUser);
  assert.deepEqual(blacklistCalls, ["active-jti"]);
});

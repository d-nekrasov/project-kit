import assert from "node:assert/strict";
import { test } from "node:test";

import { TokenBlacklistService } from "../src/core/auth/token-blacklist.service";

test("TokenBlacklistService revokes jti values until expiration", () => {
  const service = new TokenBlacklistService();
  const expiresAt = new Date(Date.now() + 10_000);

  service.revoke("test-jti", expiresAt);

  assert.equal(service.isRevoked("test-jti"), true);
});

test("TokenBlacklistService drops expired entries lazily", async () => {
  const service = new TokenBlacklistService();
  service.revoke("expired-jti", new Date(Date.now() + 5));

  await new Promise((resolve) => setTimeout(resolve, 20));

  assert.equal(service.isRevoked("expired-jti"), false);
});

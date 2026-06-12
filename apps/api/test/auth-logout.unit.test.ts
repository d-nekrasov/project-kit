import assert from "node:assert/strict";
import { test } from "node:test";

import { UnauthorizedException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";

import { AuthService } from "../src/core/auth/auth.service";
import { RealtimeEventsService } from "../src/core/realtime-events/realtime-events.service";

test("AuthService.logout adds jti to blacklist until token expiration", async () => {
  const revoked: Array<{ jti: string; expiresAt: Date }> = [];
  const service = new AuthService(
    {} as never,
    {
      async verifyAsync() {
        return {
          sub: "user-1",
          jti: "logout-jti",
          exp: 123,
        };
      },
    } as never,
    new ConfigService({}),
    {
      async write(): Promise<void> {
        return undefined;
      },
    } as never,
    {} as never,
    {
      async revoke(jti: string, expiresAt: Date): Promise<void> {
        revoked.push({ jti, expiresAt });
      },
    } as never,
    {
      async invalidate(): Promise<void> {
        return undefined;
      },
    } as never,
    new RealtimeEventsService(),
  );

  await service.logout("access-token");

  assert.deepEqual(revoked, [
    { jti: "logout-jti", expiresAt: new Date(123_000) },
  ]);
});

test("AuthService.logout emits a session revoked event so SSE streams close", async () => {
  const realtimeEvents = new RealtimeEventsService();
  const disconnectedJtis: string[] = [];
  realtimeEvents.onSessionRevoked((jti) => disconnectedJtis.push(jti));

  const service = new AuthService(
    {} as never,
    {
      async verifyAsync() {
        return {
          sub: "user-1",
          jti: "logout-jti",
          exp: 123,
        };
      },
    } as never,
    new ConfigService({}),
    {
      async write(): Promise<void> {
        return undefined;
      },
    } as never,
    {} as never,
    {
      async revoke(): Promise<void> {
        return undefined;
      },
    } as never,
    {
      async invalidate(): Promise<void> {
        return undefined;
      },
    } as never,
    realtimeEvents,
  );

  await service.logout("access-token");

  assert.deepEqual(disconnectedJtis, ["logout-jti"]);
});

test("AuthService.logout rejects tokens without jti", async () => {
  const service = new AuthService(
    {} as never,
    {
      async verifyAsync() {
        return {
          sub: "user-1",
          exp: 123,
        };
      },
    } as never,
    new ConfigService({}),
    {
      async write(): Promise<void> {
        return undefined;
      },
    } as never,
    {} as never,
    {
      async revoke(): Promise<void> {
        throw new Error("should not be called");
      },
    } as never,
    {
      async invalidate(): Promise<void> {
        return undefined;
      },
    } as never,
    new RealtimeEventsService(),
  );

  await assert.rejects(service.logout("access-token"), UnauthorizedException);
});

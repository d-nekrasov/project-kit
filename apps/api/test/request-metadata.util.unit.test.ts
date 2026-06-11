import assert from "node:assert/strict";
import { test } from "node:test";

import { getRequestMetadata } from "../src/common/utils/request-metadata.util";

test("getRequestMetadata ignores x-forwarded-for when trust proxy is off", () => {
  const metadata = getRequestMetadata({
    headers: {
      "x-forwarded-for": "198.51.100.25",
      "user-agent": "Mozilla/5.0",
    },
    ip: "::ffff:127.0.0.1",
    socket: {
      remoteAddress: "::ffff:10.0.0.5",
    },
  });

  assert.equal(metadata.ip, "127.0.0.1");
  assert.equal(metadata.userAgent, "Mozilla/5.0");
});

test("getRequestMetadata uses req.ip that was already resolved by trusted proxy", () => {
  const metadata = getRequestMetadata({
    headers: {
      "x-forwarded-for": "198.51.100.30, 10.0.0.2",
    },
    ip: "198.51.100.30",
    socket: {
      remoteAddress: "10.0.0.2",
    },
  });

  assert.equal(metadata.ip, "198.51.100.30");
});

test("getRequestMetadata ignores malformed x-forwarded-for values and falls back safely", () => {
  const metadata = getRequestMetadata({
    headers: {
      "x-forwarded-for": "not-an-ip,,,",
    },
    ip: undefined,
    socket: {
      remoteAddress: "::ffff:192.0.2.44",
    },
  });

  assert.equal(metadata.ip, "192.0.2.44");
});

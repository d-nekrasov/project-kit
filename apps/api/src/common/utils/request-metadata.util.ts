export type RequestMetadata = {
  ip?: string | null;
  userAgent?: string | null;
};

type RequestLike = {
  headers: Record<string, string | string[] | undefined>;
  ip?: string | null;
  socket?: {
    remoteAddress?: string | null;
  };
};

function normalizeIp(value: string | null | undefined): string | null {
  if (!value) {
    return null;
  }

  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }

  if (trimmed.startsWith("::ffff:")) {
    return trimmed.slice("::ffff:".length);
  }

  return trimmed;
}

export function getRequestMetadata(req: RequestLike): RequestMetadata {
  return {
    ip: normalizeIp(req.ip) ?? normalizeIp(req.socket?.remoteAddress) ?? null,
    userAgent: req.headers["user-agent"]?.toString() || null,
  };
}

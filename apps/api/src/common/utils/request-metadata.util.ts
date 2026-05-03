export type RequestMetadata = {
  ip?: string | null;
  userAgent?: string | null;
};

type RequestLike = {
  headers: Record<string, string | string[] | undefined>;
  ip?: string | null;
};

export function getRequestMetadata(req: RequestLike): RequestMetadata {
  return {
    ip: req.headers['x-forwarded-for']?.toString().split(',')[0]?.trim() || req.ip || null,
    userAgent: req.headers['user-agent']?.toString() || null
  };
}

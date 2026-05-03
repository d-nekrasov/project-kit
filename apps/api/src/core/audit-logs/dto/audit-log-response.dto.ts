export type AuditLogResponseDto = {
  id: string;
  userId: string | null;
  organizationId: string | null;
  action: string;
  entityType: string;
  entityId: string | null;
  metadata: Record<string, unknown> | null;
  ip: string | null;
  userAgent: string | null;
  createdAt: Date;
  user: {
    id: string;
    email: string;
    name: string | null;
  } | null;
  organization: {
    id: string;
    name: string;
    slug: string;
  } | null;
};

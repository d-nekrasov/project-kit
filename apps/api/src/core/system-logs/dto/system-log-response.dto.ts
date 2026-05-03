import { SystemLogLevel } from '@prisma/client';

export type SystemLogResponseDto = {
  id: string;
  level: SystemLogLevel;
  source: string;
  message: string;
  context: Record<string, unknown> | null;
  errorStack: string | null;
  userId: string | null;
  organizationId: string | null;
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

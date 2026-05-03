import { SystemLogLevel } from '@prisma/client';

export type WriteSystemLogDto = {
  level: SystemLogLevel;
  source: string;
  message: string;
  context?: Record<string, unknown> | null;
  errorStack?: string | null;
  userId?: string | null;
  organizationId?: string | null;
};

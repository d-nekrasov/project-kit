import { NotificationChannel } from '@prisma/client';

export type NotifyDto = {
  event: string;
  organizationId?: string | null;
  recipientUserIds: string[];
  payload?: Record<string, unknown> | null;
  title?: string;
  message?: string;
  channels?: NotificationChannel[];
};

export type SmtpConnectorConfig = {
  host?: string;
  port?: number;
  secure?: boolean;
  username?: string;
  password?: string;
  from?: string;
};

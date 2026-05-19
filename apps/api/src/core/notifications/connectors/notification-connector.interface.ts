import { NotificationChannel } from '@prisma/client';

export type NotificationConnectorSendResult = {
  ok: boolean;
  error?: string;
};

export type NotificationConnectorSendInput = {
  channel: NotificationChannel;
  to?: string;
  subject?: string;
  body?: string;
  config?: Record<string, unknown> | null;
};

export interface NotificationConnector {
  send(input: NotificationConnectorSendInput): Promise<NotificationConnectorSendResult>;
}

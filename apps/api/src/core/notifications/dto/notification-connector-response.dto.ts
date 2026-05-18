import { NotificationChannel, NotificationConnectorStatus } from '@prisma/client';

export type NotificationConnectorResponseDto = {
  id: string;
  code: string;
  channel: NotificationChannel;
  status: NotificationConnectorStatus;
  config: Record<string, unknown> | null;
  createdAt: Date;
  updatedAt: Date;
};

import { NotificationChannel, NotificationDeliveryStatus, NotificationStatus } from '@prisma/client';

export type NotificationDeliveryResponseDto = {
  id: string;
  channel: NotificationChannel;
  status: NotificationDeliveryStatus;
  connectorCode: string | null;
  error: string | null;
  sentAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
};

export type NotificationResponseDto = {
  id: string;
  organizationId: string | null;
  recipientUserId: string;
  event: string;
  title: string;
  message: string;
  payload: Record<string, unknown> | null;
  status: NotificationStatus;
  readAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  deliveries: NotificationDeliveryResponseDto[];
};

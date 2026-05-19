import type { NotificationStatus } from '@prisma/client';

export type NotificationSseResponse = {
  write(chunk: string): unknown;
};

export type NotificationSseClient = {
  id: string;
  userId: string;
  response: NotificationSseResponse;
  createdAt: Date;
};

export type NotificationStreamTokenPayload = {
  sub: string;
  purpose: 'notification_stream';
};

export type NotificationRealtimeCreatedEvent = {
  notification: {
    id: string;
    organizationId: string | null;
    event: string;
    title: string;
    message: string;
    status: NotificationStatus;
    createdAt: Date;
  };
  unreadCount: number;
};

export type NotificationRealtimeReadEvent = {
  notificationId: string;
  unreadCount: number;
};

export type NotificationsRealtimeReadAllEvent = {
  unreadCount: number;
};

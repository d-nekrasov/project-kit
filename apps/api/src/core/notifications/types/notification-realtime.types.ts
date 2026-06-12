import type { NotificationStatus } from '@prisma/client';

export type NotificationSseResponse = {
  write(chunk: string): unknown;
  on?(event: "close" | "error" | "finish", listener: () => void): unknown;
  flushHeaders?(): void;
  status?(code: number): unknown;
  setHeader?(name: string, value: string): unknown;
  end?(): unknown;
  writableEnded?: boolean;
  destroyed?: boolean;
};

export type NotificationSseClient = {
  id: string;
  userId: string;
  parentJti: string;
  response: NotificationSseResponse;
  createdAt: Date;
  heartbeat: NodeJS.Timeout;
  cleanup: () => void;
};

export type NotificationSseRequest = {
  on(event: "close" | "error" | "aborted", listener: () => void): unknown;
};

export type NotificationStreamTokenPayload = {
  sub: string;
  purpose: 'notification_stream';
  parentJti: string;
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

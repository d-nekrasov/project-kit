import type { PaginatedResponse } from './common.types';

export type NotificationChannel = 'IN_APP' | 'EMAIL' | 'SMS' | 'MESSENGER' | 'WEBHOOK';

export type NotificationStatus = 'UNREAD' | 'READ';

export type NotificationDeliveryStatus = 'PENDING' | 'SENT' | 'FAILED' | 'SKIPPED';

export type NotificationConnectorStatus = 'ENABLED' | 'DISABLED';

export type NotificationDeliveryResponse = {
  id: string;
  channel: NotificationChannel;
  status: NotificationDeliveryStatus;
  connectorCode: string | null;
  error: string | null;
  sentAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type NotificationResponse = {
  id: string;
  organizationId: string | null;
  recipientUserId?: string;
  event: string;
  title: string;
  message: string;
  payload: unknown;
  status: NotificationStatus;
  readAt: string | null;
  createdAt: string;
  updatedAt: string;
  deliveries: NotificationDeliveryResponse[];
};

export type MyNotificationsQuery = {
  page?: number;
  limit?: number;
  status?: NotificationStatus;
  event?: string;
};

export type MyNotificationsResponse = PaginatedResponse<NotificationResponse>;

export type UnreadNotificationsCountResponse = {
  count: number;
};

export type MarkAllNotificationsReadResponse = {
  updated: number;
};

export type NotificationConnectorResponse = {
  id: string;
  code: string;
  channel: NotificationChannel;
  status: NotificationConnectorStatus;
  config: Record<string, unknown> | null;
  createdAt: string;
  updatedAt: string;
};

export type UpdateNotificationConnectorDto = {
  status?: NotificationConnectorStatus;
  config?: Record<string, unknown>;
};

export type NotificationTemplateResponse = {
  id: string;
  event: string;
  title: string;
  message: string;
  emailSubject: string | null;
  emailBody: string | null;
  channels: NotificationChannel[];
  createdAt: string;
  updatedAt: string;
};

export type NotificationTemplatesListQuery = {
  search?: string;
};

export type UpdateNotificationTemplateDto = {
  title: string;
  message: string;
  emailSubject?: string | null;
  emailBody?: string | null;
  channels: NotificationChannel[];
};

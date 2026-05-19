import type { ApiClient } from '../client/api-client';
import type {
  MarkAllNotificationsReadResponse,
  MyNotificationsQuery,
  MyNotificationsResponse,
  NotificationResponse,
  NotificationStreamTokenResponse,
  UnreadNotificationsCountResponse
} from '../types/notifications.types';

export class NotificationsApi {
  constructor(private readonly client: ApiClient) {}

  my(query?: MyNotificationsQuery): Promise<MyNotificationsResponse> {
    return this.client.get<MyNotificationsResponse>('/notifications/my', { query });
  }

  unreadCount(): Promise<UnreadNotificationsCountResponse> {
    return this.client.get<UnreadNotificationsCountResponse>('/notifications/my/unread-count');
  }

  streamToken(): Promise<NotificationStreamTokenResponse> {
    return this.client.post<NotificationStreamTokenResponse>('/notifications/stream-token');
  }

  markRead(id: string): Promise<NotificationResponse> {
    return this.client.patch<NotificationResponse>(`/notifications/${id}/read`);
  }

  markAllRead(): Promise<MarkAllNotificationsReadResponse> {
    return this.client.patch<MarkAllNotificationsReadResponse>('/notifications/read-all');
  }
}

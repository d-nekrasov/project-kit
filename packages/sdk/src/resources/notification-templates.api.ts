import type { ApiClient } from '../client/api-client';
import type {
  NotificationTemplateResponse,
  NotificationTemplatesListQuery,
  UpdateNotificationTemplateDto
} from '../types/notifications.types';

export class NotificationTemplatesApi {
  constructor(private readonly client: ApiClient) {}

  list(query?: NotificationTemplatesListQuery): Promise<NotificationTemplateResponse[]> {
    return this.client.get<NotificationTemplateResponse[]>('/notification-templates', { query });
  }

  upsert(event: string, dto: UpdateNotificationTemplateDto): Promise<NotificationTemplateResponse> {
    return this.client.put<NotificationTemplateResponse>(`/notification-templates/${event}`, dto);
  }
}

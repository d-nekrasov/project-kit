import type { ApiClient } from '../client/api-client';
import type {
  NotificationConnectorResponse,
  UpdateNotificationConnectorDto
} from '../types/notifications.types';

export class NotificationConnectorsApi {
  constructor(private readonly client: ApiClient) {}

  list(): Promise<NotificationConnectorResponse[]> {
    return this.client.get<NotificationConnectorResponse[]>('/notification-connectors');
  }

  update(code: string, dto: UpdateNotificationConnectorDto): Promise<NotificationConnectorResponse> {
    return this.client.patch<NotificationConnectorResponse>(`/notification-connectors/${code}`, dto);
  }
}

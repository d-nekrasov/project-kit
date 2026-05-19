import { Injectable } from '@nestjs/common';
import { NotificationConnector, NotificationConnectorSendInput, NotificationConnectorSendResult } from './notification-connector.interface';

@Injectable()
export class InAppNotificationConnector implements NotificationConnector {
  async send(_input: NotificationConnectorSendInput): Promise<NotificationConnectorSendResult> {
    return { ok: true };
  }
}

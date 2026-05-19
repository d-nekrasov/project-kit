import { Injectable } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import type { NotificationSseClient, NotificationSseResponse } from './types/notification-realtime.types';

@Injectable()
export class NotificationsRealtimeService {
  private readonly clients = new Map<string, Map<string, NotificationSseClient>>();

  addClient(userId: string, response: NotificationSseResponse): string {
    const clientId = randomUUID();
    const client: NotificationSseClient = {
      id: clientId,
      userId,
      response,
      createdAt: new Date()
    };

    const userClients = this.clients.get(userId) ?? new Map<string, NotificationSseClient>();
    userClients.set(clientId, client);
    this.clients.set(userId, userClients);

    return clientId;
  }

  removeClient(userId: string, clientId: string): void {
    const userClients = this.clients.get(userId);
    if (!userClients) {
      return;
    }

    userClients.delete(clientId);

    if (userClients.size === 0) {
      this.clients.delete(userId);
    }
  }

  sendToUser(userId: string, event: string, data: unknown): void {
    const userClients = this.clients.get(userId);
    if (!userClients) {
      return;
    }

    const payload = JSON.stringify(data);

    for (const client of userClients.values()) {
      try {
        client.response.write(`event: ${event}\n`);
        client.response.write(`data: ${payload}\n\n`);
      } catch {
        this.removeClient(userId, client.id);
      }
    }
  }

  getStats(): { users: number; connections: number } {
    let connections = 0;

    for (const userClients of this.clients.values()) {
      connections += userClients.size;
    }

    return {
      users: this.clients.size,
      connections
    };
  }
}

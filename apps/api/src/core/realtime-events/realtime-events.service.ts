import { Injectable } from "@nestjs/common";

type SessionRevokedListener = (jti: string) => void;
type UserDeactivatedListener = (userId: string) => void;

/**
 * In-process bridge between auth/users and realtime transports. Keeps the
 * auth and notifications modules decoupled: producers emit here, the
 * notifications realtime service subscribes and handles cross-instance
 * fan-out itself.
 */
@Injectable()
export class RealtimeEventsService {
  private readonly sessionRevokedListeners = new Set<SessionRevokedListener>();
  private readonly userDeactivatedListeners =
    new Set<UserDeactivatedListener>();

  onSessionRevoked(listener: SessionRevokedListener): () => void {
    this.sessionRevokedListeners.add(listener);
    return () => this.sessionRevokedListeners.delete(listener);
  }

  emitSessionRevoked(jti: string): void {
    for (const listener of this.sessionRevokedListeners) {
      listener(jti);
    }
  }

  onUserDeactivated(listener: UserDeactivatedListener): () => void {
    this.userDeactivatedListeners.add(listener);
    return () => this.userDeactivatedListeners.delete(listener);
  }

  emitUserDeactivated(userId: string): void {
    for (const listener of this.userDeactivatedListeners) {
      listener(userId);
    }
  }
}

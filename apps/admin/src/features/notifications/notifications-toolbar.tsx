import type { NotificationStatus } from '@project-kit/sdk';

import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';

export type NotificationStatusFilter = 'ALL' | NotificationStatus;

type NotificationsToolbarProps = {
  event: string;
  onEventChange: (value: string) => void;
  status: NotificationStatusFilter;
  onStatusChange: (value: NotificationStatusFilter) => void;
};

export function NotificationsToolbar({ event, onEventChange, status, onStatusChange }: NotificationsToolbarProps) {
  return (
    <div className="grid gap-3 rounded-lg border bg-card p-4 md:grid-cols-2">
      <div className="space-y-2">
        <Label htmlFor="notifications-event">Event</Label>
        <Input
          id="notifications-event"
          placeholder="Filter by event"
          value={event}
          onChange={(inputEvent) => onEventChange(inputEvent.target.value)}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="notifications-status">Status</Label>
        <Select
          id="notifications-status"
          value={status}
          onChange={(inputEvent) => onStatusChange(inputEvent.target.value as NotificationStatusFilter)}
        >
          <option value="ALL">All</option>
          <option value="UNREAD">UNREAD</option>
          <option value="READ">READ</option>
        </Select>
      </div>
    </div>
  );
}

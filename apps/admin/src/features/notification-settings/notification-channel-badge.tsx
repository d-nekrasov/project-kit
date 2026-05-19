import type { NotificationChannel } from '@project-kit/sdk';

import { Badge } from '@/components/ui/badge';

type NotificationChannelBadgeProps = {
  channel: NotificationChannel;
};

export function NotificationChannelBadge({ channel }: NotificationChannelBadgeProps) {
  const className =
    channel === 'IN_APP'
      ? 'bg-emerald-100 text-emerald-800'
      : channel === 'EMAIL'
        ? 'bg-blue-100 text-blue-800'
        : 'bg-slate-100 text-foreground/80';

  return <Badge className={className}>{channel}</Badge>;
}

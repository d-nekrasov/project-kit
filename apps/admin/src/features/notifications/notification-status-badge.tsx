import type { NotificationStatus } from '@project-kit/sdk';

import { Badge } from '@/components/ui/badge';

type NotificationStatusBadgeProps = {
  status: NotificationStatus;
};

export function NotificationStatusBadge({ status }: NotificationStatusBadgeProps) {
  const className =
    status === 'UNREAD'
      ? 'bg-blue-100 text-blue-800'
      : 'bg-slate-100 text-foreground/80';

  return <Badge className={className}>{status}</Badge>;
}

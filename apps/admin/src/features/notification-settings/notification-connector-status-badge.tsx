import type { NotificationConnectorStatus } from '@project-kit/sdk';

import { Badge } from '@/components/ui/badge';

type NotificationConnectorStatusBadgeProps = {
  status: NotificationConnectorStatus;
};

export function NotificationConnectorStatusBadge({ status }: NotificationConnectorStatusBadgeProps) {
  const className =
    status === 'ENABLED'
      ? 'bg-emerald-100 text-emerald-800'
      : 'bg-slate-100 text-slate-700';

  return <Badge className={className}>{status}</Badge>;
}

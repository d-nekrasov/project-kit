import type { NotificationConnectorStatus } from '@project-kit/sdk';

import { Badge } from '@/components/ui/badge';
import { useI18n } from '@/lib/i18n/use-i18n';

type NotificationConnectorStatusBadgeProps = {
  status: NotificationConnectorStatus;
};

export function NotificationConnectorStatusBadge({ status }: NotificationConnectorStatusBadgeProps) {
  const { t } = useI18n();
  const className =
    status === 'ENABLED'
      ? 'bg-emerald-100 text-emerald-800'
      : 'bg-slate-100 text-foreground/80';

  return <Badge className={className}>{status === 'ENABLED' ? t('modules.status.enabled') : t('modules.status.disabled')}</Badge>;
}

import type { ModuleStatus } from '@project-kit/sdk';

import { Badge } from '@/components/ui/badge';
import { useI18n } from '@/lib/i18n/use-i18n';

type ModuleStatusBadgeProps = {
  status: ModuleStatus;
};

export function ModuleStatusBadge({ status }: ModuleStatusBadgeProps) {
  const { t } = useI18n();
  if (status === 'ENABLED') {
    return <Badge className="bg-emerald-100 text-emerald-800">{t('modules.status.enabled')}</Badge>;
  }

  return <Badge className="bg-slate-200 text-foreground/80">{t('modules.status.disabled')}</Badge>;
}

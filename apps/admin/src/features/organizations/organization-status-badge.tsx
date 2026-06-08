import type { OrganizationStatus } from '@project-kit/sdk';

import { Badge } from '@/components/ui/badge';
import { useI18n } from '@/lib/i18n/use-i18n';

export function OrganizationStatusBadge({ status }: { status: OrganizationStatus }) {
  const { t } = useI18n();
  const className = status === 'ACTIVE' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800';

  return <Badge className={className}>{status === 'ACTIVE' ? t('organizations.status.active') : t('organizations.status.inactive')}</Badge>;
}

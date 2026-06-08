import type { UserStatus } from '@project-kit/sdk';

import { Badge } from '@/components/ui/badge';
import { useI18n } from '@/lib/i18n/use-i18n';

export function UserStatusBadge({ status }: { status: UserStatus }) {
  const { t } = useI18n();
  const className =
    status === 'ACTIVE'
      ? 'bg-emerald-100 text-emerald-800'
      : status === 'INACTIVE'
        ? 'bg-amber-100 text-amber-800'
        : 'bg-rose-100 text-rose-800';

  const label =
    status === 'ACTIVE'
      ? t('users.status.active')
      : status === 'INACTIVE'
        ? t('users.status.inactive')
        : t('users.status.blocked');

  return <Badge className={className}>{label}</Badge>;
}

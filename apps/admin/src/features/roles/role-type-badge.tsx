import type { RoleType } from '@project-kit/sdk';

import { Badge } from '@/components/ui/badge';
import { useI18n } from '@/lib/i18n/use-i18n';

type RoleTypeBadgeProps = {
  type: RoleType;
};

export function RoleTypeBadge({ type }: RoleTypeBadgeProps) {
  const { t } = useI18n();
  if (type === 'SYSTEM') {
    return <Badge className="bg-slate-200 text-foreground/80">{t('roles.type.system')}</Badge>;
  }

  return <Badge className="bg-blue-100 text-blue-700">{t('roles.type.organization')}</Badge>;
}

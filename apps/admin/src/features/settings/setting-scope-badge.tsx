import type { SettingScope } from '@project-kit/sdk';

import { Badge } from '@/components/ui/badge';
import { useI18n } from '@/lib/i18n/use-i18n';

const SCOPE_STYLES: Record<SettingScope, string> = {
  GLOBAL: 'bg-violet-100 text-violet-700',
  ORGANIZATION: 'bg-sky-100 text-sky-700',
  MODULE: 'bg-amber-100 text-amber-700'
};

export function SettingScopeBadge({ scope }: { scope: SettingScope }) {
  const { t } = useI18n();
  const label =
    scope === 'GLOBAL' ? t('settings.scope.global') : scope === 'ORGANIZATION' ? t('settings.scope.organization') : t('settings.scope.module');
  return <Badge className={SCOPE_STYLES[scope]}>{label}</Badge>;
}

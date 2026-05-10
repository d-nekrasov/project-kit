import type { SettingScope } from '@project-kit/sdk';

import { Badge } from '@/components/ui/badge';

const SCOPE_STYLES: Record<SettingScope, string> = {
  GLOBAL: 'bg-violet-100 text-violet-700',
  ORGANIZATION: 'bg-sky-100 text-sky-700',
  MODULE: 'bg-amber-100 text-amber-700'
};

export function SettingScopeBadge({ scope }: { scope: SettingScope }) {
  return <Badge className={SCOPE_STYLES[scope]}>{scope}</Badge>;
}

import type { SystemLogLevel } from '@project-kit/sdk';

import { Badge } from '@/components/ui/badge';

type SystemLogLevelBadgeProps = {
  level: SystemLogLevel;
};

const LEVEL_CLASSNAME: Record<SystemLogLevel, string> = {
  DEBUG: 'bg-slate-100 text-foreground/80',
  INFO: 'bg-blue-100 text-blue-800',
  WARN: 'bg-amber-100 text-amber-800',
  ERROR: 'bg-rose-100 text-rose-800',
  FATAL: 'bg-red-200 text-red-900'
};

export function SystemLogLevelBadge({ level }: SystemLogLevelBadgeProps) {
  return <Badge className={LEVEL_CLASSNAME[level]}>{level}</Badge>;
}

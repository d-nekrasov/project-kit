import type { ModuleStatus } from '@project-kit/sdk';

import { Badge } from '@/components/ui/badge';

type ModuleStatusBadgeProps = {
  status: ModuleStatus;
};

export function ModuleStatusBadge({ status }: ModuleStatusBadgeProps) {
  if (status === 'ENABLED') {
    return <Badge className="bg-emerald-100 text-emerald-800">ENABLED</Badge>;
  }

  return <Badge className="bg-slate-200 text-slate-700">DISABLED</Badge>;
}

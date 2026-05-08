import type { RoleType } from '@project-kit/sdk';

import { Badge } from '@/components/ui/badge';

type RoleTypeBadgeProps = {
  type: RoleType;
};

export function RoleTypeBadge({ type }: RoleTypeBadgeProps) {
  if (type === 'SYSTEM') {
    return <Badge className="bg-slate-200 text-slate-700">SYSTEM</Badge>;
  }

  return <Badge className="bg-blue-100 text-blue-700">ORGANIZATION</Badge>;
}

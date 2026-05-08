import type { OrganizationStatus } from '@project-kit/sdk';

import { Badge } from '@/components/ui/badge';

export function OrganizationStatusBadge({ status }: { status: OrganizationStatus }) {
  const className = status === 'ACTIVE' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800';

  return <Badge className={className}>{status}</Badge>;
}

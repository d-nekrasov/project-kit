import type { UserStatus } from '@project-kit/sdk';

import { Badge } from '@/components/ui/badge';

export function UserStatusBadge({ status }: { status: UserStatus }) {
  const className =
    status === 'ACTIVE'
      ? 'bg-emerald-100 text-emerald-800'
      : status === 'INACTIVE'
        ? 'bg-amber-100 text-amber-800'
        : 'bg-rose-100 text-rose-800';

  return <Badge className={className}>{status}</Badge>;
}

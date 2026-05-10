import type { DocumentStatus } from '@project-kit/sdk';

import { Badge } from '@/components/ui/badge';

type DocumentStatusBadgeProps = {
  status: DocumentStatus;
};

const statusClasses: Record<DocumentStatus, string> = {
  DRAFT: 'bg-slate-100 text-slate-700',
  PUBLISHED: 'bg-emerald-100 text-emerald-700',
  ARCHIVED: 'bg-amber-100 text-amber-700'
};

export function DocumentStatusBadge({ status }: DocumentStatusBadgeProps) {
  return <Badge className={statusClasses[status]}>{status}</Badge>;
}

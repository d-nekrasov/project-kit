import type { DocumentStatus } from '@project-kit/sdk';

import { Badge } from '@/components/ui/badge';
import { useI18n } from '@/lib/i18n/use-i18n';

type DocumentStatusBadgeProps = {
  status: DocumentStatus;
};

const statusClasses: Record<DocumentStatus, string> = {
  DRAFT: 'bg-slate-100 text-foreground/80',
  PUBLISHED: 'bg-emerald-100 text-emerald-700',
  ARCHIVED: 'bg-amber-100 text-amber-700'
};

export function DocumentStatusBadge({ status }: DocumentStatusBadgeProps) {
  const { t } = useI18n();
  const normalizedStatus = status.toLowerCase();
  const translatedStatus = t(`documents.status.${normalizedStatus}`);
  const badgeClassName = statusClasses[status] ?? 'bg-slate-100 text-foreground/80';

  return <Badge className={badgeClassName}>{translatedStatus === `documents.status.${normalizedStatus}` ? status : translatedStatus}</Badge>;
}

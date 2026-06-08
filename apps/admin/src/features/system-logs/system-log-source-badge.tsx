import { Badge } from '@/components/ui/badge';
import { useI18n } from '@/lib/i18n/use-i18n';

type SystemLogSourceBadgeProps = {
  source: string;
};

export function SystemLogSourceBadge({ source }: SystemLogSourceBadgeProps) {
  const { t } = useI18n();
  return <Badge className="bg-slate-200 text-foreground">{source || t('common.unknown')}</Badge>;
}

import { Badge } from '@/components/ui/badge';

type SystemLogSourceBadgeProps = {
  source: string;
};

export function SystemLogSourceBadge({ source }: SystemLogSourceBadgeProps) {
  return <Badge className="bg-slate-200 text-foreground">{source || 'unknown'}</Badge>;
}

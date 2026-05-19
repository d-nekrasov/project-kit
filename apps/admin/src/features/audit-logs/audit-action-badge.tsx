import { Badge } from '@/components/ui/badge';

function getActionVariant(action: string) {
  if (action.includes('.create')) {
    return 'bg-emerald-100 text-emerald-800';
  }
  if (action.includes('.update') || action.includes('.status_update') || action.includes('.permissions_update')) {
    return 'bg-amber-100 text-amber-800';
  }
  if (action.startsWith('auth.')) {
    return 'bg-blue-100 text-blue-800';
  }
  return 'bg-slate-100 text-foreground';
}

export function AuditActionBadge({ action }: { action: string }) {
  return <Badge className={getActionVariant(action)}>{action}</Badge>;
}


import { Badge } from '@/components/ui/badge';

export function PermissionModuleBadge({ module }: { module: string }) {
  if (module === 'core') {
    return <Badge className="bg-emerald-100 text-emerald-800">{module}</Badge>;
  }

  return <Badge>{module}</Badge>;
}

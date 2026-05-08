import { Badge } from '@/components/ui/badge';

export function PermissionModuleBadge({ module }: { module: string }) {
  return <Badge>{module}</Badge>;
}
